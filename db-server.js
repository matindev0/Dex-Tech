#!/usr/bin/env node
// ===== SIMPLE DATABASE SERVER =====
// Run with: node db-server.js
// No npm install needed!

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Initialize database file if it doesn't exist
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

// Read database
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { posts: [], settings: {} };
  }
}

// Write database
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Send JSON response
function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Handle API requests
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /api/data - Get all data
  if (req.method === 'GET' && pathname === '/api/data') {
    const db = readDB();
    return sendJSON(res, 200, db);
  }

  // GET /api/posts - Get all posts
  if (req.method === 'GET' && pathname === '/api/posts') {
    const db = readDB();
    return sendJSON(res, 200, db.posts);
  }

  // POST /api/posts - Add new post
  if (req.method === 'POST' && pathname === '/api/posts') {
    try {
      const body = await parseBody(req);
      const db = readDB();
      
      const newPost = {
        id: Date.now().toString(),
        title: body.title || 'Untitled',
        description: body.description || '',
        category: body.category || 'general',
        youtubeEmbed: body.youtubeEmbed || '',
        thumbnail: body.thumbnail || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      db.posts.unshift(newPost);
      db.settings.lastModified = newPost.createdAt;
      writeDB(db);
      
      console.log('Post created:', newPost.title);
      return sendJSON(res, 201, newPost);
    } catch (e) {
      return sendJSON(res, 400, { error: e.message });
    }
  }

  // PUT /api/posts/:id - Update post
  if (req.method === 'PUT' && pathname.startsWith('/api/posts/')) {
    try {
      const id = pathname.split('/').pop();
      const body = await parseBody(req);
      const db = readDB();
      
      const index = db.posts.findIndex(p => p.id === id);
      if (index === -1) {
        return sendJSON(res, 404, { error: 'Post not found' });
      }
      
      db.posts[index] = {
        ...db.posts[index],
        title: body.title || db.posts[index].title,
        description: body.description || db.posts[index].description,
        category: body.category || db.posts[index].category,
        youtubeEmbed: body.youtubeEmbed || db.posts[index].youtubeEmbed,
        thumbnail: body.thumbnail || db.posts[index].thumbnail,
        updatedAt: new Date().toISOString()
      };
      
      db.settings.lastModified = db.posts[index].updatedAt;
      writeDB(db);
      
      console.log('Post updated:', db.posts[index].title);
      return sendJSON(res, 200, db.posts[index]);
    } catch (e) {
      return sendJSON(res, 400, { error: e.message });
    }
  }

  // DELETE /api/posts/:id - Delete post
  if (req.method === 'DELETE' && pathname.startsWith('/api/posts/')) {
    try {
      const id = pathname.split('/').pop();
      const db = readDB();
      
      const index = db.posts.findIndex(p => p.id === id);
      if (index === -1) {
        return sendJSON(res, 404, { error: 'Post not found' });
      }
      
      const deleted = db.posts.splice(index, 1)[0];
      db.settings.lastModified = new Date().toISOString();
      writeDB(db);
      
      console.log('Post deleted:', deleted.title);
      return sendJSON(res, 200, { success: true });
    } catch (e) {
      return sendJSON(res, 400, { error: e.message });
    }
  }

  // PUT /api/settings - Update settings
  if (req.method === 'PUT' && pathname === '/api/settings') {
    try {
      const body = await parseBody(req);
      const db = readDB();
      
      db.settings = {
        ...db.settings,
        adsenseCode: body.adsenseCode || db.settings.adsenseCode,
        analyticsCode: body.analyticsCode || db.settings.analyticsCode,
        lastModified: new Date().toISOString()
      };
      
      writeDB(db);
      return sendJSON(res, 200, db.settings);
    } catch (e) {
      return sendJSON(res, 400, { error: e.message });
    }
  }

  // POST /api/reset - Reset database
  if (req.method === 'POST' && pathname === '/api/reset') {
    const resetData = {
      posts: [],
      settings: {
        adsenseCode: '',
        analyticsCode: '',
        lastModified: new Date().toISOString()
      }
    };
    writeDB(resetData);
    console.log('Database reset');
    return sendJSON(res, 200, { success: true, posts: [] });
  }

  // 404 for unknown routes
  sendJSON(res, 404, { error: 'Not found' });
}

// Start server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     Database Server Running!          ║
╠════════════════════════════════════════╣
║  URL: http://localhost:${PORT}            ║
║  Data: ${DB_FILE}
╠════════════════════════════════════════╣
║  Endpoints:                           ║
║  - GET    /api/data                  ║
║  - GET    /api/posts                  ║
║  - POST   /api/posts                  ║
║  - PUT    /api/posts/:id              ║
║  - DELETE /api/posts/:id               ║
║  - PUT    /api/settings               ║
║  - POST   /api/reset                  ║
╚════════════════════════════════════════╝
  `);
});
