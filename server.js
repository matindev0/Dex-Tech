// ===== HYBRID SERVER =====
// Uses MongoDB Atlas if configured, otherwise falls back to file-based storage
// Can use environment variables: MONGO_URI, DB_NAME, PORT

const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const UPLOAD_DIR = path.join(ROOT_DIR, 'assets', 'images', 'uploads');
const DB_FILE = path.join(ROOT_DIR, 'database.json');

// ===== CONFIGURATION =====
const MONGO_URI = process.env.MONGO_URI || `mongodb+srv://matindev:Matin@cluster0.lcv6xlw.mongodb.net/?retryWrites=true&w=majority`;
const DB_NAME = process.env.DB_NAME || 'dextech';

// Initialize local database if it doesn't exist and MongoDB is not configured
function initializeLocalDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      posts: [],
      settings: {
        adsenseCode: '',
        analyticsCode: '',
        lastModified: new Date().toISOString()
      }
    }, null, 2));
  }
}

// Read local database
function readLocalDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { posts: [], settings: {} };
  }
}

// Write local database
function writeLocalDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let db = null;
let client = null;
let useMongoDB = false;

// ===== DATABASE FUNCTIONS (HYBRID: MONGODB OR FILE-BASED) =====

async function connectToMongo() {
  if (!MONGO_URI) {
    console.log('ℹ️ MongoDB URI not configured. Using local file-based database.');
    initializeLocalDB();
    useMongoDB = false;
    return true;
  }
  
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');
    
    // Create indexes
    await db.collection('posts').createIndex({ createdAt: -1 });
    await db.collection('settings').createIndex({ id: 1 });
    
    useMongoDB = true;
    return true;
  } catch (error) {
    console.error('⚠️ MongoDB connection failed:', error.message);
    console.log('📁 Falling back to local file-based database.');
    initializeLocalDB();
    useMongoDB = false;
    return true;
  }
}

async function getPosts() {
  if (useMongoDB && db) {
    try {
      return await db.collection('posts').find({}).sort({ createdAt: -1 }).toArray();
    } catch (_) {
      return [];
    }
  } else {
    const data = readLocalDB();
    return data.posts || [];
  }
}

async function getPostById(id) {
  if (useMongoDB && db) {
    try {
      return await db.collection('posts').findOne({ id: id });
    } catch (_) {
      return null;
    }
  } else {
    const data = readLocalDB();
    return (data.posts || []).find(p => p.id === id) || null;
  }
}

async function addPost(post) {
  const newPost = {
    id: Date.now().toString(),
    title: post.title || 'Untitled',
    description: post.description || '',
    category: post.category || 'general',
    youtubeEmbed: post.youtubeEmbed || '',
    thumbnail: post.thumbnail || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (useMongoDB && db) {
    try {
      await db.collection('posts').insertOne(newPost);
      await updateSettingsLastModified(newPost.createdAt);
      return newPost;
    } catch (_) {
      return null;
    }
  } else {
    const data = readLocalDB();
    data.posts = data.posts || [];
    data.posts.push(newPost);
    writeLocalDB(data);
    return newPost;
  }
}

async function updatePost(id, post) {
  if (useMongoDB && db) {
    try {
      const existing = await db.collection('posts').findOne({ id: id });
      if (!existing) return null;
      
      const updated = {
        ...existing,
        title: post.title || existing.title,
        description: post.description || existing.description,
        category: post.category || existing.category,
        youtubeEmbed: post.youtubeEmbed !== undefined ? post.youtubeEmbed : existing.youtubeEmbed,
        thumbnail: post.thumbnail !== undefined ? post.thumbnail : existing.thumbnail,
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('posts').replaceOne({ id: id }, updated);
      await updateSettingsLastModified(updated.updatedAt);
      return updated;
    } catch (_) {
      return null;
    }
  } else {
    const data = readLocalDB();
    const index = (data.posts || []).findIndex(p => p.id === id);
    if (index === -1) return null;
    
    const updated = {
      ...data.posts[index],
      title: post.title || data.posts[index].title,
      description: post.description || data.posts[index].description,
      category: post.category || data.posts[index].category,
      youtubeEmbed: post.youtubeEmbed !== undefined ? post.youtubeEmbed : data.posts[index].youtubeEmbed,
      thumbnail: post.thumbnail !== undefined ? post.thumbnail : data.posts[index].thumbnail,
      updatedAt: new Date().toISOString()
    };
    
    data.posts[index] = updated;
    writeLocalDB(data);
    return updated;
  }
}

async function deletePost(id) {
  if (useMongoDB && db) {
    try {
      const result = await db.collection('posts').deleteOne({ id: id });
      if (result.deletedCount > 0) {
        await updateSettingsLastModified(new Date().toISOString());
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  } else {
    const data = readLocalDB();
    const index = (data.posts || []).findIndex(p => p.id === id);
    if (index === -1) return false;
    
    data.posts.splice(index, 1);
    writeLocalDB(data);
    return true;
  }
}

async function getSettings() {
  if (useMongoDB && db) {
    try {
      const settings = await db.collection('settings').findOne({ id: 'appSettings' });
      return settings || {
        adsenseCode: '',
        analyticsCode: '',
        lastModified: new Date().toISOString()
      };
    } catch (_) {
      return null;
    }
  } else {
    const data = readLocalDB();
    return data.settings || {
      adsenseCode: '',
      analyticsCode: '',
      lastModified: new Date().toISOString()
    };
  }
}

async function updateSettings(newSettings) {
  const settings = {
    id: 'appSettings',
    adsenseCode: newSettings.adsenseCode || '',
    analyticsCode: newSettings.analyticsCode || '',
    lastModified: new Date().toISOString()
  };
  
  if (useMongoDB && db) {
    try {
      await db.collection('settings').replaceOne({ id: 'appSettings' }, settings, { upsert: true });
      return settings;
    } catch (_) {
      return null;
    }
  } else {
    const data = readLocalDB();
    if (!data.settings) data.settings = {};
    data.settings.lastModified = timestamp;
    writeLocalDB(data);
  }
}

async function resetData() {
  if (useMongoDB && db) {
    try {
      await db.collection('posts').deleteMany({});
      await db.collection('settings').replaceOne(
        { id: 'appSettings' },
        {
          id: 'appSettings',
          adsenseCode: '',
          analyticsCode: '',
          lastModified: new Date().toISOString()
        },
        { upsert: true }
      );
      return true;
    } catch (_) {
      return false;
    }
  } else {
    const data = {
      posts: [],
      settings: {
        id: 'appSettings',
        adsenseCode: '',
        analyticsCode: '',
        lastModified: new Date().toISOString()
      }
    };
    writeLocalDB(data);
    return true;
  }
}

// ===== FILE FUNCTIONS =====

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mime: match[1].toLowerCase(),
    base64: match[2]
  };
}

function extensionFromMime(mime) {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  return map[mime] || null;
}

function sanitizeFilename(name) {
  return String(name || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'image';
}

// ===== HTTP HANDLERS =====

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
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

async function handleApi(req, res, pathname) {
  // GET /api/data
  if (req.method === 'GET' && pathname === '/api/data') {
    const posts = await getPosts();
    const settings = await getSettings();
    return sendJson(res, 200, {
      adminPin: '3003',
      posts,
      settings: settings || { adsenseCode: '', analyticsCode: '', lastModified: new Date().toISOString() }
    });
  }

  // GET /api/posts
  if (req.method === 'GET' && pathname === '/api/posts') {
    const posts = await getPosts();
    return sendJson(res, 200, posts);
  }

  // GET /api/posts/:id
  if (req.method === 'GET' && pathname.startsWith('/api/posts/')) {
    const id = decodeURIComponent(pathname.slice('/api/posts/'.length));
    const post = await getPostById(id);
    if (!post) return sendJson(res, 404, { error: 'Post not found' });
    return sendJson(res, 200, post);
  }

  // POST /api/posts
  if (req.method === 'POST' && pathname === '/api/posts') {
    try {
      const payload = normalizePostInput(await readJsonBody(req));
      if (!isValidPostInput(payload)) {
        return sendJson(res, 400, { error: 'title, description, and category are required' });
      }
      const newPost = await addPost(payload);
      if (!newPost) return sendJson(res, 500, { error: 'Failed to create post' });
      return sendJson(res, 201, newPost);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // PUT /api/posts/:id
  if (req.method === 'PUT' && pathname.startsWith('/api/posts/')) {
    const id = decodeURIComponent(pathname.slice('/api/posts/'.length));
    try {
      const payload = normalizePostInput(await readJsonBody(req));
      if (!isValidPostInput(payload)) {
        return sendJson(res, 400, { error: 'title, description, and category are required' });
      }
      const updated = await updatePost(id, payload);
      if (!updated) return sendJson(res, 404, { error: 'Post not found' });
      return sendJson(res, 200, updated);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // DELETE /api/posts/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/posts/')) {
    const id = decodeURIComponent(pathname.slice('/api/posts/'.length));
    const success = await deletePost(id);
    if (!success) return sendJson(res, 404, { error: 'Post not found' });
    return sendJson(res, 200, { success: true });
  }

  // GET /api/settings
  if (req.method === 'GET' && pathname === '/api/settings') {
    const settings = await getSettings();
    return sendJson(res, 200, settings || { adsenseCode: '', analyticsCode: '', lastModified: new Date().toISOString() });
  }

  // PUT /api/settings
  if (req.method === 'PUT' && pathname === '/api/settings') {
    try {
      const payload = await readJsonBody(req);
      const settings = await updateSettings(payload);
      return sendJson(res, 200, settings);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // POST /api/upload-image
  if (req.method === 'POST' && pathname === '/api/upload-image') {
    ensureUploadDir();
    try {
      const payload = await readJsonBody(req);
      const parsed = parseDataUrl(payload.dataUrl);
      if (!parsed) return sendJson(res, 400, { error: 'Invalid image data URL' });

      const ext = extensionFromMime(parsed.mime);
      if (!ext) return sendJson(res, 400, { error: 'Only png, jpg, gif, and webp are supported' });

      const safeBase = sanitizeFilename(payload.filename || 'image');
      const fileName = `${Date.now()}-${safeBase}.${ext}`;
      const fullPath = path.join(UPLOAD_DIR, fileName);
      const buffer = Buffer.from(parsed.base64, 'base64');
      fs.writeFileSync(fullPath, buffer);

      return sendJson(res, 201, { path: `assets/images/uploads/${fileName}` });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // POST /api/reset
  if (req.method === 'POST' && pathname === '/api/reset') {
    await resetData();
    return sendJson(res, 200, { success: true, posts: [] });
  }

  return sendJson(res, 404, { error: 'API route not found' });
}

function handleStatic(req, res, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const normalizedPath = path.normalize(decodeURIComponent(requestedPath)).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(ROOT_DIR, normalizedPath);

  if (!filePath.startsWith(ROOT_DIR)) {
    return sendText(res, 404, '404 Not Found');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      return sendText(res, 404, '404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };

    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ===== MAIN SERVER =====

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    await handleApi(req, res, pathname);
    return;
  }

  handleStatic(req, res, pathname);
});

// Start server
server.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════╗
║     Dex-Tech Server Starting...      ║
╠════════════════════════════════════════╣
║  Port: ${PORT}
║  Database: Hybrid (MongoDB or File)
╚════════════════════════════════════════╝
  `);
  
  // Try to connect to database
  await connectToMongo();
  
  if (useMongoDB) {
    console.log('✅ Using MongoDB Cloud (MongoDB Atlas)');
  } else {
    console.log('✅ Using local file-based database (database.json)');
    console.log('   Set MONGO_URI environment variable to switch to MongoDB');
  }
  
  console.log(`\nServer running at http://localhost:${PORT}`);
  console.log('Admin panel: http://localhost:3000/admin.html');
});
