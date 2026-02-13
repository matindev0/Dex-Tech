# MongoDB Database Setup

Your site now uses **MongoDB Atlas** - a free cloud database!

## Why MongoDB?

- **Free tier**: 512MB storage, no credit card
- **Cloud hosted**: Access from anywhere
- **Automatic sync**: Posts save instantly

## Setup Steps

### Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas/database)
2. Click **"Try Free"** → **"Create"**
3. Sign up with Google or email

### Step 2: Create Free Cluster

1. Select **"Create"** → **"Free"**
2. Choose Google/GCP
3. Select a region
4. Click **"Create Cluster"**

### Step 3: Create Database User

1. Click **"Database Access"**
2. Click **"Add New Database User"**
3. Username: `dextech`
4. Generate a password and **copy it!**

### Step 4: Configure Network Access

1. Click **"Network Access"**
2. Click **"Add IP Address"**
3. Select **"Allow Access from Anywhere"**
4. Click **"Confirm"**

### Step 5: Get Connection String

1. Click **"Clusters"** → **"Connect"**
2. Select **"Connect your application"**
3. Copy the connection string

### Step 6: Update server.js

Open `server.js` and replace:

```javascript
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
```

With your connection string:

```javascript
const MONGO_URI = 'mongodb+srv://dextech:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/dextech?retryWrites=true&w=majority';
```

### Step 7: Install Dependencies

```bash
npm install mongodb
```

### Step 8: Run the Server

```bash
node server.js
```

## How It Works

1. Start server: `node server.js`
2. Open `http://localhost:3000/admin.html`
3. Add posts - they save to MongoDB automatically!

## Environment Variables (Optional)

Instead of editing server.js, you can use environment variables:

```bash
export MONGO_URI='mongodb+srv://dextech:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/dextech'
export DB_NAME='dextech'
node server.js
```

## Features

✅ Automatic post saving  
✅ Free cloud storage  
✅ Data persists forever  
✅ Access from anywhere
