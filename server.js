// server.js - Backend using Postgres (Neon) for Dex-Tech
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Postgres (Neon) connection — required for this server
const PG_CONNECTION_STRING = process.env.PG_CONNECTION_STRING || null;

let pgPool = null;

async function connectDB() {
  if (!PG_CONNECTION_STRING) {
    console.error('❌ PG_CONNECTION_STRING is not set. Please set it to your Neon/Postgres connection string.');
    process.exit(1);
  }

  try {
    pgPool = new Pool({ connectionString: PG_CONNECTION_STRING, max: 10 });
    await pgPool.query('SELECT 1');
    console.log('✅ Connected to Postgres (PG)');

    // Ensure posts and settings tables exist
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        data JSONB,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      );
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMPTZ
      );
    `);
  } catch (error) {
    console.error('❌ Postgres connection error:', error);
    process.exit(1);
  }
}

// ===== POSTS ENDPOINTS =====

// GET all posts
app.get('/api/posts', async (req, res) => {
  try {
    const { rows } = await pgPool.query('SELECT id, data, created_at, updated_at FROM posts ORDER BY created_at DESC');
    const posts = rows.map(r => ({
      ...r.data,
      _id: r.id || r.data._id || null,
      id: r.id || r.data.id || null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null
    }));
    res.json({ documents: posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await pgPool.query('SELECT data, created_at, updated_at FROM posts WHERE id = $1 LIMIT 1', [id]);
    if (!rows[0]) return res.json(null);
    const r = rows[0];
    const post = {
      ...r.data,
      _id: id,
      id: id,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null
    };
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE post
app.post('/api/posts', async (req, res) => {
  try {
    const body = req.body || {};
    const id = body._id || body.id || Date.now().toString();
    const now = new Date();
    const result = await pgPool.query(
      `INSERT INTO posts (id, data, created_at, updated_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at RETURNING id`,
      [id, body, now.toISOString(), now.toISOString()]
    );
    return res.json({ insertedId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE post
app.patch('/api/posts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const now = new Date();
    const body = req.body || {};
    const result = await pgPool.query(
      `UPDATE posts SET data = $1, updated_at = $2 WHERE id = $3 RETURNING id`,
      [body, now.toISOString(), id]
    );
    return res.json({ acknowledged: result.rowCount > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pgPool.query('DELETE FROM posts WHERE id = $1', [id]);
    return res.json({ acknowledged: result.rowCount > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SETTINGS ENDPOINTS =====

// GET settings
app.get('/api/settings', async (req, res) => {
  try {
    const { rows } = await pgPool.query('SELECT data FROM settings WHERE key = $1 LIMIT 1', ['default']);
    return res.json(rows[0] ? rows[0].data : null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE settings
app.put('/api/settings', async (req, res) => {
  try {
    const now = new Date();
    const body = req.body || {};
    const result = await pgPool.query(
      `INSERT INTO settings (key, data, updated_at) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at RETURNING key`,
      ['default', body, now.toISOString()]
    );
    return res.json({ acknowledged: !!result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
