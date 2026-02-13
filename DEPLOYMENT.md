# Static Site Deployment Guide

This guide explains how to manage posts without Node.js - posts are stored as code in your project files.

## Two Options for Data Storage

You have two options for storing posts:

1. **`assets/js/data.js`** - Standard approach (JavaScript file)
2. **`post-data.html`** - HTML file that acts as a local database

## Option 1: Using post-data.html (Recommended)

This is your local database file that contains all posts as code.

### Adding Posts

1. Open `admin.html` directly in your browser:
   ```
   file:///C:/Users/matin/OneDrive/Desktop/Dex-Tech/admin.html
   ```

2. Enter your PIN (default: `3003`)

3. Add posts using the admin panel

### Exporting to post-data.html

1. Go to **Settings** tab
2. Click **"Export post-data.html"** or **"Copy post-data.html"**
3. Save the file as `post-data.html` in your project root

### How It Works

- The `post-data.html` file acts as your local database
- It contains `window.POSTS_DATA` with all your posts
- The site automatically loads posts from this file
- Commit and deploy to make posts visible to users

## Option 2: Using data.js

### Adding Posts

1. Open `admin.html` in your browser
2. Add posts
3. Go to **Settings** → Click **"Copy data.js Code"**
4. Open `assets/js/data.js` and replace content

### Deployment Steps

```bash
git add post-data.html  # or assets/js/data.js
git commit -m "Add new posts"
git push
```

Netlify will automatically redeploy.

## Quick Start

### Step 1: Add Posts

```
1. Double-click admin.html
2. Enter PIN: 3003
3. Click "Add New Post"
4. Fill in title, description, category
5. Upload thumbnail
6. Click "Save Post"
```

### Step 2: Export Database

```
1. Go to Settings
2. Click "Export post-data.html"
3. Save as post-data.html in project root
```

### Step 3: Deploy

```
1. git add post-data.html
2. git commit -m "Add new posts"
3. git push
4. Netlify auto-deploys
```

## Viewing Posts

- **Main site:** `https://your-site.netlify.app/`
- **Posts page:** `https://your-site.netlify.app/post.html`

## Troubleshooting

### Posts don't appear

1. Verify `post-data.html` exists in project root
2. Check browser console for errors
3. Make sure file was committed and pushed
4. Verify `window.POSTS_DATA` exists in the file

### Images not showing

1. Use relative paths: `assets/images/your-image.jpg`
2. Upload images to `assets/images/`
3. Compress images before uploading

### PIN not working

Default PIN is `3003`. Check `assets/js/data.js` for your custom PIN.

## Backing Up

Export regularly:

1. Go to **Settings**
2. Click **"Export as JSON"**
3. Save the JSON file

## Resetting Data

To reset all posts:

1. Go to **Settings**
2. Click **"Reset Data To Zero"**
3. Export empty database and commit

## Image Guidelines

- Thumbnails: 600x400px max
- Use JPG for photos, PNG for graphics
- Compress with TinyPNG or similar

## File Structure After Setup

```
Dex-Tech/
├── post-data.html          ← Your posts database
├── admin.html              ← Admin panel
├── index.html              ← Main site
├── post.html               ← Posts page
├── assets/
│   └── js/
│       ├── data.js         ← Fallback data
│       ├── database.js     ← Database functions
│       └── ...
└── assets/images/          ← Your images
```
