# Cross-Device Sync Setup Guide

## Overview
Your Dex-Tech application now supports **cross-device synchronization**! Posts and settings created on one device will automatically appear on all other devices. This is achieved by connecting to a backend server that syncs data across devices.

## How It Works

1. **Backend Server** - Stores all posts and settings in a database
2. **Frontend** - Fetches data from the backend server
3. **Offline Support** - Works offline using localStorage cache, and syncs when online

## Prerequisites

- Node.js installed (v14 or higher)
- PostgreSQL database (or use Neon for free hosting)
- Environment variables configured

## Step 1: Set Up Database

### Option A: Use Neon (Recommended - Free PostgreSQL Hosting)

1. Go to [Neon Console](https://console.neon.tech)
2. Sign up or log in
3. Create a new project
4. Copy the connection string (it looks like: `postgresql://user:password@host/database`)
5. Keep this safe - you'll need it in Step 2

### Option B: Use Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a new database: `createdb dex_tech`
3. Connection string: `postgresql://localhost/dex_tech`

## Step 2: Configure Environment Variables

Create a `.env` file in the root of your project:

```bash
PG_CONNECTION_STRING=postgresql://user:password@host/database
PORT=3000
NODE_ENV=production
```

Replace the connection string with your actual database URL.

## Step 3: Install Dependencies

```bash
npm install
```

This installs: express, cors, pg

Your `package.json` should have:
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "pg": "^8.8.0",
    "dotenv": "^16.0.0"
  }
}
```

## Step 4: Start the Backend Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm install -D nodemon
npm run dev
```

You should see:
```
✅ Connected to Postgres (PG)
🚀 Server running on http://localhost:3000
```

## Step 5: Update Frontend Configuration (If Needed)

The frontend automatically detects your backend:

- **Local Development**: `http://localhost:3000`
- **Production**: Uses `window.location.origin` (same domain as website)

If you're testing on different devices on the same network, make sure to access via your computer's IP address:
- Get your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Access on mobile: `http://YOUR_IP:3000`

## Step 6: Deploy!

### Deploy Backend to Render/Railway/Heroku

1. Push your code to GitHub
2. Connect to your hosting platform
3. Set environment variable: `PG_CONNECTION_STRING`
4. Deploy!

### Deploy Frontend

1. Build your static files (or serve as-is)
2. Deploy to GitHub Pages, Vercel, Netlify, etc.
3. Update the API endpoint in `database.js` if needed

## Testing Cross-Device Sync

1. **Desktop**: Go to `http://localhost:3000/admin.html`
2. **Mobile**: Go to `http://YOUR_IP:3000/admin.html`
3. Create a post on desktop
4. Refresh mobile - post appears!
5. Go offline and create another post
6. Go back online - post syncs to backend

## Troubleshooting

### Posts not syncing?

Check browser console for errors:
```
⚠️ Backend unavailable, using offline mode
```

This means the backend isn't reachable. Verify:
- Backend server is running
- IP address is correct
- No firewall blocking port 3000

### "PG_CONNECTION_STRING is not set"

Make sure your `.env` file exists in the root directory with:
```
PG_CONNECTION_STRING=your_connection_string_here
```

### Database connection error

- Test connection: `psql postgresql://user:password@host/database`
- Ensure PostgreSQL is running
- Check firewall rules (for remote databases)

## API Endpoints

### Posts
- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

## Database Schema

### posts table
```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### settings table
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMPTZ
);
```

## Features

✅ **Automatic Sync** - Posts sync instantly across devices  
✅ **Offline Support** - Works offline with localStorage cache  
✅ **Cross-Device** - Same posts on desktop, mobile, tablet  
✅ **Persistent** - Data survives browser restarts  
✅ **Fast** - Caches locally for instant access  

## Security Notes

- Always use HTTPS in production
- Consider adding authentication for admin panel
- Use environment variables for sensitive data
- Never commit `.env` to version control

## Mobile Testing Tips

1. Use your local IP instead of localhost
2. Ensure mobile and desktop are on same WiFi
3. Check browser console for connection issues
4. Hard refresh (Ctrl+Shift+R) if changes don't appear

## Next Steps

1. Set up PostgreSQL database
2. Create `.env` file with connection string
3. Run `npm install`
4. Run `npm start`
5. Test on multiple devices!

Need help? Check server logs for detailed error messages.
