// ===== MONGODB REST API CLIENT =====
// Uses MongoDB Data API for all database operations
// MongoDB Atlas Configuration needed:
// 1. Create MongoDB Atlas account (https://www.mongodb.com/cloud/atlas)
// 2. Create a database with collections: posts, settings
// 3. Enable Data API in Atlas
// 4. Get your API Key and Data API URL
// 5. Update MONGODB_API_KEY and MONGODB_DATA_API_URL below

const MONGODB_CONFIG = {
  // Update these with your MongoDB Atlas Data API credentials
  API_KEY: 'majority', // Get from MongoDB Atlas > Data API
  API_URL: 'mongodb+srv://matindev:Matin@cluster0.lcv6xlw.mongodb.net/?retryWrites=true&w=majority', // e.g., https://data.mongodb-api.com/app/API_ID/endpoint/data/v1
  DB_NAME: 'dex_tech', // Your database name
  POSTS_COLLECTION: 'posts',
  SETTINGS_COLLECTION: 'settings'
};

const DB = {
  // Admin PIN
  adminPin: '3003',

  // Initialize database
  async init() {
    try {
      // Verify MongoDB configuration
      if (MONGODB_CONFIG.API_KEY === 'YOUR_MONGODB_DATA_API_KEY') {
        console.warn('MongoDB API Key not configured. Please update MONGODB_CONFIG in database.js');
        return;
      }
      // Test connection and create initial settings if needed
      const settings = await this.getSettings();
      if (!settings) {
        await this.updateSettings({
          adsenseCode: '',
          analyticsCode: '',
          lastModified: new Date().toISOString()
        });
      }
      console.log('MongoDB connection initialized');
    } catch (error) {
      console.error('Error initializing MongoDB:', error);
    }
  },

  // Make MongoDB Data API request
  async makeRequest(method, collection, data = null) {
    const url = `${MONGODB_CONFIG.API_URL}/databases/${MONGODB_CONFIG.DB_NAME}/collections/${collection}/documents`;
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'api-key': MONGODB_CONFIG.API_KEY
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`MongoDB API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('MongoDB API request failed:', error);
      throw error;
    }
  },

  // ===== POSTS OPERATIONS =====
  
  async getPosts() {
    try {
      const response = await this.makeRequest(
        'GET',
        MONGODB_CONFIG.POSTS_COLLECTION,
        { filter: {} }
      );
      return response.documents || [];
    } catch (error) {
      console.error('Error reading posts:', error);
      return [];
    }
  },

  async addPost(post) {
    try {
      const newPost = {
        title: post.title,
        description: post.description,
        category: post.category,
        youtubeEmbed: post.youtubeEmbed,
        thumbnail: post.thumbnail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await this.makeRequest(
        'POST',
        MONGODB_CONFIG.POSTS_COLLECTION,
        { document: newPost }
      );

      return response.insertedId ? { ...newPost, _id: response.insertedId } : null;
    } catch (error) {
      console.error('Error adding post:', error);
      throw error;
    }
  },

  async updatePost(id, post) {
    try {
      const updatedData = {
        title: post.title,
        description: post.description,
        category: post.category,
        youtubeEmbed: post.youtubeEmbed,
        thumbnail: post.thumbnail,
        updatedAt: new Date().toISOString()
      };

      await this.makeRequest(
        'PATCH',
        MONGODB_CONFIG.POSTS_COLLECTION,
        {
          filter: { _id: { $oid: id } },
          update: { $set: updatedData }
        }
      );

      return { _id: id, ...post, ...updatedData };
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  async deletePost(id) {
    try {
      await this.makeRequest(
        'DELETE',
        MONGODB_CONFIG.POSTS_COLLECTION,
        { filter: { _id: { $oid: id } } }
      );
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  async getPostById(id) {
    try {
      const response = await this.makeRequest(
        'GET',
        MONGODB_CONFIG.POSTS_COLLECTION,
        { filter: { _id: { $oid: id } } }
      );
      return response.documents && response.documents.length > 0 ? response.documents[0] : null;
    } catch (error) {
      console.error('Error getting post by ID:', error);
      return null;
    }
  },

  async searchPosts(query) {
    try {
      const lowerQuery = query.toLowerCase();
      const response = await this.makeRequest(
        'GET',
        MONGODB_CONFIG.POSTS_COLLECTION,
        {
          filter: {
            $or: [
              { title: { $regex: lowerQuery, $options: 'i' } },
              { description: { $regex: lowerQuery, $options: 'i' } },
              { category: { $regex: lowerQuery, $options: 'i' } }
            ]
          }
        }
      );
      return response.documents || [];
    } catch (error) {
      console.error('Error searching posts:', error);
      return [];
    }
  },

  // ===== SETTINGS OPERATIONS =====
  
  async getSettings() {
    try {
      const response = await this.makeRequest(
        'GET',
        MONGODB_CONFIG.SETTINGS_COLLECTION,
        { filter: {} }
      );
      return response.documents && response.documents.length > 0 ? response.documents[0] : null;
    } catch (error) {
      console.error('Error reading settings:', error);
      return null;
    }
  },

  async updateSettings(settings) {
    try {
      const existingSettings = await this.getSettings();
      
      const updatedSettings = {
        adsenseCode: settings.adsenseCode || '',
        analyticsCode: settings.analyticsCode || '',
        lastModified: new Date().toISOString()
      };

      if (existingSettings) {
        // Update existing settings
        await this.makeRequest(
          'PATCH',
          MONGODB_CONFIG.SETTINGS_COLLECTION,
          {
            filter: { _id: { $oid: existingSettings._id } },
            update: { $set: updatedSettings }
          }
        );
        return { ...existingSettings, ...updatedSettings };
      } else {
        // Create new settings document
        const response = await this.makeRequest(
          'POST',
          MONGODB_CONFIG.SETTINGS_COLLECTION,
          { document: updatedSettings }
        );
        return response.insertedId ? { _id: response.insertedId, ...updatedSettings } : null;
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  },

  // ===== YOUTUBE UTILITIES =====
  extractVideoId(url) {
    if (!url) return null;

    // If it's already just a video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
      return url.trim();
    }

    let input = String(url).trim();

    // If user pasted an <iframe ...> string, return the full iframe HTML exactly as provided
    const iframeMatch = input.match(/(<iframe[\s\S]*?<\/iframe>)/i);
    if (iframeMatch && iframeMatch[1]) {
      return iframeMatch[1].trim();
    }

    // If it's an embed URL (contains /embed/), return the full embed URL so caller can use it verbatim
    const embedMatch = input.match(/https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:[?&][^\s]*)?/i);
    if (embedMatch) {
      const urlOnly = input.match(/https?:\/\/(?:www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}(?:[?&][^\s]*)?/i)[0];
      return urlOnly;
    }

    // Extract from youtube.com/watch?v=ID (with optional extra params)
    let videoIdMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i);
    if (videoIdMatch) return videoIdMatch[1];

    // Extract from youtu.be/ID (with optional params)
    videoIdMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (videoIdMatch) return videoIdMatch[1];

    // As a last resort, if input looks like a full URL to youtube (but didn't match above), return it
    if (/https?:\/\/(?:www\.)?youtube\.com|https?:\/\/(?:www\.)?youtu\.be/i.test(input)) {
      return input;
    }

    return null;
  },

  // ===== AUTH =====
  verifyPin(pin) {
    return String(pin) === String(this.adminPin);
  },

  // ===== FILE HANDLING =====
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // ===== UTILITY FUNCTIONS =====
  stringToObjectId(str) {
    // Converts string to MongoDB ObjectId format if needed
    return str;
  }
};

// Initialize database on page load
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
});
