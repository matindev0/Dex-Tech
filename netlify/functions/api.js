// ===== NETLIFY FUNCTION - LOCAL FILE-BASED DATABASE EMULATION =====
// Uses in-memory storage to simulate database.json behavior
// NOTE: Data resets on each function cold start in production
// For persistent storage, use Netlify KV or deploy locally with server.js

// In-memory "database" - mimics database.json structure
const LOCAL_DB = {
  posts: [],
  settings: {
    adsenseCode: '',
    analyticsCode: '',
    lastModified: new Date().toISOString()
  }
};

// Load initial data from environment variable if provided (for initial seeding)
if (process.env.INITIAL_DATA) {
  try {
    const initialData = JSON.parse(process.env.INITIAL_DATA);
    if (Array.isArray(initialData.posts)) {
      LOCAL_DB.posts = initialData.posts;
    }
    if (initialData.settings) {
      LOCAL_DB.settings = { ...LOCAL_DB.settings, ...initialData.settings };
    }
  } catch (e) {
    console.log('Could not parse INITIAL_DATA env var');
  }
}

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

function touchSettings(timestamp) {
  LOCAL_DB.settings.lastModified = timestamp;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

    const path = event.path.replace(/^\/\.netlify\/functions\/api/, '') || '/';
    const method = event.httpMethod;

    // ===== DATA ENDPOINTS =====

    if (method === 'GET' && path === '/data') {
      return json(200, {
        adminPin: '3003',
        posts: LOCAL_DB.posts,
        settings: LOCAL_DB.settings
      });
    }

    if (method === 'GET' && path === '/posts') {
      return json(200, LOCAL_DB.posts);
    }

    if (method === 'GET' && path.startsWith('/posts/')) {
      const id = decodeURIComponent(path.slice('/posts/'.length));
      const post = LOCAL_DB.posts.find(p => p.id === id);
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

      LOCAL_DB.posts.unshift(newPost);
      touchSettings(now);
      return json(201, newPost);
    }

    if (method === 'PUT' && path.startsWith('/posts/')) {
      const id = decodeURIComponent(path.slice('/posts/'.length));
      const payload = normalizePostInput(safeJsonParse(event.body));
      if (!isValidPostInput(payload)) {
        return json(400, { error: 'title, description, and category are required' });
      }

      const index = LOCAL_DB.posts.findIndex(p => p.id === id);
      if (index === -1) return json(404, { error: 'Post not found' });

      const updated = {
        ...LOCAL_DB.posts[index],
        title: payload.title || LOCAL_DB.posts[index].title,
        description: payload.description || LOCAL_DB.posts[index].description,
        category: payload.category || LOCAL_DB.posts[index].category,
        youtubeEmbed: payload.youtubeEmbed !== undefined ? payload.youtubeEmbed : LOCAL_DB.posts[index].youtubeEmbed,
        thumbnail: payload.thumbnail !== undefined ? payload.thumbnail : LOCAL_DB.posts[index].thumbnail,
        updatedAt: new Date().toISOString()
      };

      LOCAL_DB.posts[index] = updated;
      touchSettings(updated.updatedAt);
      return json(200, updated);
    }

    if (method === 'DELETE' && path.startsWith('/posts/')) {
      const id = decodeURIComponent(path.slice('/posts/'.length));
      const index = LOCAL_DB.posts.findIndex(p => p.id === id);
      if (index === -1) return json(404, { error: 'Post not found' });

      LOCAL_DB.posts.splice(index, 1);
      touchSettings(new Date().toISOString());
      return json(200, { success: true });
    }

    // ===== SETTINGS ENDPOINTS =====

    if (method === 'GET' && path === '/settings') {
      return json(200, LOCAL_DB.settings);
    }

    if (method === 'PUT' && path === '/settings') {
      const payload = safeJsonParse(event.body);
      LOCAL_DB.settings = {
        ...LOCAL_DB.settings,
        adsenseCode: String(payload.adsenseCode || ''),
        analyticsCode: String(payload.analyticsCode || ''),
        lastModified: new Date().toISOString()
      };
      return json(200, LOCAL_DB.settings);
    }

    // ===== RESET ENDPOINT =====

    if (method === 'POST' && path === '/reset') {
      LOCAL_DB.posts = [];
      LOCAL_DB.settings = {
        adsenseCode: '',
        analyticsCode: '',
        lastModified: new Date().toISOString()
      };
      return json(200, { success: true, posts: [] });
    }

    return json(404, { error: 'API route not found' });
  } catch (error) {
    return json(500, { error: error.message || 'Internal server error' });
  }
};
