const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'dextech';

let cachedClient = null;
let cachedDb = null;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

async function getDb() {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not configured.');
  }

  if (cachedDb) return cachedDb;

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URI);
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db(DB_NAME);
  await cachedDb.collection('posts').createIndex({ createdAt: -1 });
  await cachedDb.collection('settings').createIndex({ id: 1 }, { unique: true });
  return cachedDb;
}

function safeJsonParse(raw) {
  if (!raw || !String(raw).trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    throw new Error('Invalid JSON');
  }
}

function normalizePostInput(input) {
  return {
    title: String(input && input.title ? input.title : '').trim(),
    description: String(input && input.description ? input.description : '').trim(),
    category: String(input && input.category ? input.category : '').trim(),
    youtubeEmbed: String(input && input.youtubeEmbed ? input.youtubeEmbed : '').trim(),
    thumbnail: String(input && input.thumbnail ? input.thumbnail : '').trim()
  };
}

function isValidPostInput(post) {
  return Boolean(post.title && post.description && post.category);
}

async function getSettings(db) {
  const settings = await db.collection('settings').findOne({ id: 'appSettings' });
  if (settings) return settings;
  return {
    id: 'appSettings',
    adsenseCode: '',
    analyticsCode: '',
    lastModified: new Date().toISOString()
  };
}

async function touchSettings(db, timestamp) {
  await db.collection('settings').updateOne(
    { id: 'appSettings' },
    {
      $set: {
        id: 'appSettings',
        lastModified: timestamp
      },
      $setOnInsert: {
        adsenseCode: '',
        analyticsCode: ''
      }
    },
    { upsert: true }
  );
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

    const db = await getDb();
    const path = event.path.replace(/^\/\.netlify\/functions\/api/, '') || '/';
    const method = event.httpMethod;

    if (method === 'GET' && path === '/data') {
      const posts = await db.collection('posts').find({}).sort({ createdAt: -1 }).toArray();
      const settings = await getSettings(db);
      return json(200, {
        adminPin: '3003',
        posts,
        settings
      });
    }

    if (method === 'GET' && path === '/posts') {
      const posts = await db.collection('posts').find({}).sort({ createdAt: -1 }).toArray();
      return json(200, posts);
    }

    if (method === 'GET' && path.startsWith('/posts/')) {
      const id = decodeURIComponent(path.slice('/posts/'.length));
      const post = await db.collection('posts').findOne({ id });
      if (!post) return json(404, { error: 'Post not found' });
      return json(200, post);
    }

    if (method === 'POST' && path === '/posts') {
      const payload = normalizePostInput(safeJsonParse(event.body));
      if (!isValidPostInput(payload)) {
        return json(400, { error: 'title, description, and category are required' });
      }

      const now = new Date().toISOString();
      const newPost = {
        id: Date.now().toString(),
        title: payload.title,
        description: payload.description,
        category: payload.category,
        youtubeEmbed: payload.youtubeEmbed,
        thumbnail: payload.thumbnail,
        createdAt: now,
        updatedAt: now
      };

      await db.collection('posts').insertOne(newPost);
      await touchSettings(db, now);
      return json(201, newPost);
    }

    if (method === 'PUT' && path.startsWith('/posts/')) {
      const id = decodeURIComponent(path.slice('/posts/'.length));
      const payload = normalizePostInput(safeJsonParse(event.body));
      if (!isValidPostInput(payload)) {
        return json(400, { error: 'title, description, and category are required' });
      }

      const existing = await db.collection('posts').findOne({ id });
      if (!existing) return json(404, { error: 'Post not found' });

      const updated = {
        ...existing,
        title: payload.title || existing.title,
        description: payload.description || existing.description,
        category: payload.category || existing.category,
        youtubeEmbed: payload.youtubeEmbed !== undefined ? payload.youtubeEmbed : existing.youtubeEmbed,
        thumbnail: payload.thumbnail !== undefined ? payload.thumbnail : existing.thumbnail,
        updatedAt: new Date().toISOString()
      };

      await db.collection('posts').replaceOne({ id }, updated);
      await touchSettings(db, updated.updatedAt);
      return json(200, updated);
    }

    if (method === 'DELETE' && path.startsWith('/posts/')) {
      const id = decodeURIComponent(path.slice('/posts/'.length));
      const result = await db.collection('posts').deleteOne({ id });
      if (!result.deletedCount) return json(404, { error: 'Post not found' });
      await touchSettings(db, new Date().toISOString());
      return json(200, { success: true });
    }

    if (method === 'GET' && path === '/settings') {
      const settings = await getSettings(db);
      return json(200, settings);
    }

    if (method === 'PUT' && path === '/settings') {
      const payload = safeJsonParse(event.body);
      const settings = {
        id: 'appSettings',
        adsenseCode: String(payload.adsenseCode || ''),
        analyticsCode: String(payload.analyticsCode || ''),
        lastModified: new Date().toISOString()
      };
      await db.collection('settings').replaceOne({ id: 'appSettings' }, settings, { upsert: true });
      return json(200, settings);
    }

    if (method === 'POST' && path === '/reset') {
      await db.collection('posts').deleteMany({});
      const settings = {
        id: 'appSettings',
        adsenseCode: '',
        analyticsCode: '',
        lastModified: new Date().toISOString()
      };
      await db.collection('settings').replaceOne({ id: 'appSettings' }, settings, { upsert: true });
      return json(200, { success: true, posts: [] });
    }

    return json(404, { error: 'API route not found' });
  } catch (error) {
    return json(500, { error: error.message || 'Internal server error' });
  }
};
