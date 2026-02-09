// server.js - Simple MongoDB Backend for Dex-Tech
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://matindev:Matin@cluster0.lcv6xlw.mongodb.net/?retryWrites=true&w=majority';
const DB_NAME = 'dex_tech';
let client;
let db;

// Connect to MongoDB
async function connectDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// ===== POSTS ENDPOINTS =====

// GET all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await db.collection('posts').find({}).toArray();
    res.json({ documents: posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const post = await db.collection('posts').findOne({ _id: new ObjectId(req.params.id) });
    res.json(post || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE post
app.post('/api/posts', async (req, res) => {
  try {
    const result = await db.collection('posts').insertOne({
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    res.json({ insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE post
app.patch('/api/posts/:id', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date().toISOString() } }
    );
    res.json({ acknowledged: result.acknowledged });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const result = await db.collection('posts').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ acknowledged: result.acknowledged });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SETTINGS ENDPOINTS =====

// GET settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.collection('settings').findOne({});
    res.json(settings || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE settings
app.put('/api/settings', async (req, res) => {
  try {
    const result = await db.collection('settings').updateOne(
      {},
      { $set: { ...req.body, lastModified: new Date().toISOString() } },
      { upsert: true }
    );
    res.json({ acknowledged: result.acknowledged });
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
