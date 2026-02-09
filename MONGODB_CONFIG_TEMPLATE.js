// ===== MONGODB CONFIGURATION TEMPLATE =====
// Copy and paste your MongoDB credentials here
// DO NOT COMMIT TO PUBLIC REPOS - Add to .gitignore

const MONGODB_CONFIG = {
  // Step 1: Get your Data API Key from MongoDB Atlas
  // Go to: App Services > API Keys > Create API Key
  API_KEY: 'YOUR_MONGODB_DATA_API_KEY',

  // Step 2: Get your Data API URL from MongoDB Atlas
  // Go to: Data API > Overview > Copy your URL
  // URL format: https://data.mongodb-api.com/app/{APP_ID}/endpoint/data/v1
  API_URL: 'YOUR_MONGODB_DATA_API_URL',

  // Step 3: Your database and collection names
  // Database name (create in MongoDB Atlas)
  DB_NAME: 'dex_tech',

  // Collections (create both in your database)
  POSTS_COLLECTION: 'posts',
  SETTINGS_COLLECTION: 'settings'
};

// ===== EXAMPLE CONFIGURATION =====
/*
const MONGODB_CONFIG = {
  API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  API_URL: 'https://data.mongodb-api.com/app/data-jkxyz/endpoint/data/v1',
  DB_NAME: 'dex_tech',
  POSTS_COLLECTION: 'posts',
  SETTINGS_COLLECTION: 'settings'
};
*/

// ===== SETUP STEPS =====
/*
1. Create MongoDB Atlas Account (free tier: https://www.mongodb.com/cloud/atlas)

2. Create Cluster and Collections:
   - Database: dex_tech
   - Collections: posts, settings

3. Enable Data API:
   - Go to App Services
   - Create an App
   - Enable Data API

4. Create API Key:
   - Go to Authentication
   - Create a new API Key
   - Copy and paste into API_KEY above

5. Get Data API URL:
   - Go to Data API
   - Copy your API URL
   - Paste into API_URL above

6. Update database.js:
   - Open assets/js/database.js
   - Replace MONGODB_CONFIG values with your credentials

7. Test:
   - Open admin.html
   - Add a post
   - Verify it appears on post.html
   - Check MongoDB Atlas to see the stored document
*/
