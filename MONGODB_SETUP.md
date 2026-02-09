# MongoDB Setup Guide for Dex-Tech

## Overview
Your Dex-Tech application now uses **MongoDB Atlas** as its database, replacing the local localStorage system. All data — posts, settings — are now stored in MongoDB and serve as the single source of truth for your application.

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click **Sign Up** and create a free account
3. Complete the registration and email verification

## Step 2: Create a New Project and Cluster

1. In MongoDB Atlas dashboard, click **New Project**
2. Name it "Dex-Tech" and click **Create Project**
3. Inside the project, click **Create a Deployment**
4. Select **M0 Free** tier (recommended for development)
5. Choose your preferred cloud provider and region
6. Click **Create Deployment**
7. Wait for the cluster to be created (usually 1-2 minutes)

## Step 3: Enable MongoDB Data API

1. In your MongoDB Atlas dashboard, go to **App Services**
2. Click **Create an App**
3. Name it "dex-tech-api" and select your cluster
4. Click **Create App**
5. Once created, go to **Data API** in the left sidebar
6. Click **Enable Data API**
7. Copy your **Data API URL** - you'll need this

## Step 4: Create Collections

1. Go to **Database > Collections**
2. Click **Create Collection** inside your cluster
3. Database name: `dex_tech`
4. Create two collections:
   - `posts` - stores all blog posts
   - `settings` - stores site settings (AdSense code, Analytics code)

## Step 5: Get Your API Key

1. In App Services, go to **Authentication**
2. Click **Create API Key**
3. Enter a descriptive name like "dex-tech-web"
4. Click **Create**
5. Copy the API Key immediately (you can't see it again!)

## Step 6: Configure Your Application

1. Open `assets/js/database.js` in your editor
2. Look for the `MONGODB_CONFIG` object at the top
3. Replace the configuration:

```javascript
const MONGODB_CONFIG = {
  API_KEY: 'YOUR_MONGODB_DATA_API_KEY',        // Paste your API Key here
  API_URL: 'YOUR_MONGODB_DATA_API_URL',        // Paste your Data API URL here
  DB_NAME: 'dex_tech',                          // Keep as is
  POSTS_COLLECTION: 'posts',                    // Keep as is
  SETTINGS_COLLECTION: 'settings'               // Keep as is
};
```

### Example Configuration:
```javascript
const MONGODB_CONFIG = {
  API_KEY: 'abc123def456ghi789',
  API_URL: 'https://data.mongodb-api.com/app/data-xyzabc/endpoint/data/v1',
  DB_NAME: 'dex_tech',
  POSTS_COLLECTION: 'posts',
  SETTINGS_COLLECTION: 'settings'
};
```

## Step 7: Test Your Connection

1. Open your application in a browser
2. Go to the Admin Panel (`admin.html`)
3. Log in with PIN: `3003`
4. Try adding a new post:
   - Fill in title, description, category
   - Upload a thumbnail image
   - Click "Add Post"
5. If successful, the post will be saved to MongoDB!
6. Go to Posts page to verify the post appears

## Step 8: Verify Data in MongoDB

1. Go to MongoDB Atlas > Database > Collections
2. Click on the `posts` collection
3. You should see your posts stored as documents

## Important Security Notes

⚠️ **For Production:**
1. **Never expose your API Key** in client-side code
2. Use environment variables or a backend server to handle MongoDB operations
3. Implement proper authentication and authorization
4. Set IP address restrictions in MongoDB Atlas

For now, this setup is suitable for development/personal use.

## Database Schema

### Posts Collection
```json
{
  "_id": ObjectId,
  "title": "Post Title",
  "description": "Post content...",
  "category": "Category Name",
  "youtubeEmbed": "video-id-or-url",
  "thumbnail": "base64-image-data",
  "createdAt": "2026-02-09T...",
  "updatedAt": "2026-02-09T..."
}
```

### Settings Collection
```json
{
  "_id": ObjectId,
  "adsenseCode": "ad-code",
  "analyticsCode": "analytics-code",
  "lastModified": "2026-02-09T..."
}
```

## Troubleshooting

### Data not saving
- Check browser console for errors (F12)
- Verify API Key and URL are correct
- Ensure collections exist in MongoDB
- Check network tab to see API requests
- Verify API Key hasn't expired

### Posts not loading
- Check MongoDB Atlas > Network Access > IP Whitelist
- Ensure Data API is enabled
- Verify collections are not empty

### Admin panel not working
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser console for JavaScript errors
- Verify database.js configuration is correct

## Making Changes to MongoDB

### To add settings:
1. Admin Panel > Settings tab
2. Enter AdSense Code and Analytics Code
3. Click "Save Settings"
4. Changes are instantly saved to MongoDB

### To edit a post:
1. Admin Panel > Posts tab
2. Click the edit icon on any post
3. Modify the content
4. Click "Save"
5. Changes are reflected immediately across the website

### To delete a post:
1. Admin Panel > Posts tab
2. Click the trash icon
3. Confirm deletion
4. Post is removed from MongoDB and website

## API Reference

All methods in `database.js` are async and return Promises:

```javascript
// Posts
await DB.getPosts()                    // Get all posts
await DB.getPostById(id)              // Get single post
await DB.addPost(postObject)          // Create new post
await DB.updatePost(id, postObject)   // Update post
await DB.deletePost(id)               // Delete post
await DB.searchPosts(query)           // Search posts

// Settings
await DB.getSettings()                // Get settings
await DB.updateSettings(settings)     // Update settings

// Utilities
DB.verifyPin(pin)                     // Check admin PIN
await DB.fileToBase64(file)           // Convert image to base64
DB.extractVideoId(url)                // Extract YouTube video ID
```

## Next Steps

1. Test all core functionality:
   - ✅ Add a post
   - ✅ Edit a post
   - ✅ Delete a post
   - ✅ Search/filter posts
   - ✅ Update settings

2. For production deployment:
   - Set up a backend server (Node.js/Express recommended)
   - Move MongoDB operations to backend
   - Implement proper authentication
   - Use environment variables for sensitive data

## Support & Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Data API Guide](https://www.mongodb.com/docs/atlas/app-services/data-api/)
- [Mongoose Documentation](https://mongoosejs.com/) (for backend implementation)

---

**Backend Implementation (Optional)**

If you want to set up a backend server for better security, create a simple Express server:

```bash
npm install express mongoose cors dotenv
```

Then move the database operations from `database.js` to your backend API endpoints. This keeps your API Key secure and gives you more control over data operations.

Enjoy using MongoDB with Dex-Tech! 🚀
