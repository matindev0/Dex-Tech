# MongoDB Setup Guide

Your site can use **MongoDB Atlas** - a free cloud database!

## Why MongoDB?

- **Free tier**: 512MB storage, no credit card
- **Cloud hosted**: Access from anywhere
- **Automatic sync**: Posts save instantly

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas/database)
2. Click **"Try Free"** → **"Create"**
3. Sign up with Google or email
4. Complete registration

## Step 2: Create Free Cluster

1. Select **"Create"** → **"Free"**
2. Choose a cloud provider (Google/GCP is recommended)
3. Select a region closest to you
4. Click **"Create Cluster"** (wait 1-3 minutes)

## Step 3: Create Database User

1. Click **"Database Access"** in the left sidebar
2. Click **"Add New Database User"**
3. Enter:
   - **Username**: `dextech`
   - **Password**: Generate a strong password (copy it!)
4. Click **"Add User"**

## Step 4: Configure Network Access

1. Click **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. Select **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Click **"Confirm"**

## Step 5: Get Connection String

1. Click **"Clusters"** in the left sidebar
2. Click **"Connect"** on your cluster
3. Select **"Connect your application"**
4. Copy the connection string:

```
mongodb+srv://dextech:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## Step 6: Update Server Configuration

1. Open `server.js`
2. Find the MongoDB configuration section
3. Replace `YOUR_PASSWORD` with your actual password:

```javascript
const MONGO_URI = 'mongodb+srv://dextech:your_password@cluster0.xxxxx.mongodb.net/dextech?retryWrites=true&w=majority';
```

## Step 7: Install Dependencies

```bash
npm install mongodb
```

## Step 8: Run the Server

```bash
node server.js
```

## How It Works

1. Start the server: `node server.js`
2. Open `http://localhost:3000/admin.html`
3. Add posts - they save to MongoDB automatically!

## Troubleshooting

### Connection failed?

1. Check password is correct in connection string
2. Ensure network access allows 0.0.0.0/0
3. Verify cluster is not paused

### Need to reset data?

Go to MongoDB Atlas → Collections → Delete documents from `posts` collection
