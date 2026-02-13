# MongoDB Setup & Fix - Complete Guide

## What Was Fixed

✅ **Removed hardcoded MongoDB credentials** from `server.js`  
✅ **Added environment variable support** using `.env` file  
✅ **Created `.env.example`** with setup instructions  
✅ **Added `.gitignore`** to protect sensitive data  
✅ **Added `dotenv` package** to `package.json`

## Why This Matters

Previously, your MongoDB connection string with username and password was hardcoded in the source code. This is a **security risk** and shouldn't be committed to git. Now it's managed via environment variables.

## Quick Setup (5 minutes)

### Step 1: Create .env File

Create a new file named **`.env`** in your project root with this content:

```
MONGO_URI=mongodb+srv://dextech:YOUR_PASSWORD@cluster0.lcv6xlw.mongodb.net/?retryWrites=true&w=majority
DB_NAME=dextech
PORT=3000
NODE_ENV=development
```

Replace `YOUR_PASSWORD` with your actual MongoDB password.

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- `mongodb` - MongoDB driver
- `dotenv` - Loads environment variables from .env

### Step 3: Start Server

```bash
npm start
```

Or:

```bash
node server.js
```

## If You Don't Have MongoDB Yet

### Complete MongoDB Atlas Setup (10 minutes)

1. **Create Account** (Free)
   - Go to https://www.mongodb.com/cloud/atlas
   - Click "Try Free"
   - Sign up with Google or email

2. **Create Cluster**
   - Click "Create" → "Free"
   - Choose cloud provider (Google/GCP)
   - Select region closest to you
   - Wait 1-3 minutes

3. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Username: `dextech`
   - Password: Generate strong password (save it!)
   - Click "Add User"

4. **Set Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Select "Allow Access from Anywhere"
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Clusters"
   - Click "Connect"
   - Select "Connect your application"
   - Copy the connection string

6. **Update .env**
   - Edit `.env` file
   - Paste connection string as `MONGO_URI`
   - Replace `<password>` with your database password
   - Save

## Verification

Test your setup by running:

```bash
node server.js
```

You should see:
```
Connected to MongoDB
Server running on port 3000
```

## Troubleshooting

### Error: "MONGO_URI environment variable is not set!"

**Solution:** Create `.env` file with `MONGO_URI` set. See Step 1 above.

### Error: "Failed to connect to MongoDB"

**Possible causes:**
- Wrong password in connection string
- IP address not whitelisted (re-check Network Access)
- Cluster not ready yet (wait 2-3 minutes)

**Solutions:**
1. Double-check password in MongoDB Atlas
2. Ensure "Allow Access from Anywhere" is set
3. Wait for cluster to fully initialize
4. Try creating a new connection string

### Server starts but posts don't sync

- Ensure MongoDB connection is successful (check logs)
- Check that collections exist in MongoDB Atlas
- Posts are saved to MongoDB, not local files

## Environment Variables Explanation

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `DB_NAME` | Database name | `dextech` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment type | `development` or `production` |

## Security Notes

⚠️ **Never commit `.env` file to git!**

The `.gitignore` file already protects it, so make sure:
- Your `.env` file is in the project root
- You don't accidently add it to git
- Keep `.env` secure and backed up

## File Changes Summary

1. **server.js** - Now requires `dotenv` and validates `MONGO_URI`
2. **package.json** - Added `dotenv` dependency
3. **.env.example** - Shows required environment variables
4. **.gitignore** - Protects `.env` file from git commits

---

Need help? Check the MongoDB Atlas documentation: https://docs.atlas.mongodb.com/
