// ===== MONGODB BACKEND API CLIENT =====
// Connects to backend server at localhost:3000
// Backend runs: node server.js
// Make sure to start server before using the app

const API_BASE = 'http://localhost:3000/api';

const DB = {
  // Admin PIN
  adminPin: '3003',

  // Initialize database
  async init() {
    try {
      // Test connection to backend
      const settings = await this.getSettings();
      if (!settings) {
        await this.updateSettings({
          adsenseCode: '',
          analyticsCode: '',
          lastModified: new Date().toISOString()
        });
      }
      console.log('✅ Connected to MongoDB via backend server');
    } catch (error) {
      console.error('❌ Backend connection error:', error);
      console.warn('Make sure to run: node server.js');
    }
  },

  // Make backend API request
  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE}${endpoint}`;
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Backend request failed:', error);
      throw error;
    }
  },

  // ===== POSTS OPERATIONS =====
  
  async getPosts() {
    try {
      const response = await this.makeRequest('/posts', 'GET');
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
        thumbnail: post.thumbnail
      };

      const response = await this.makeRequest('/posts', 'POST', newPost);
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
        thumbnail: post.thumbnail
      };

      await this.makeRequest(`/posts/${id}`, 'PATCH', updatedData);
      return { _id: id, ...post, ...updatedData };
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  async deletePost(id) {
    try {
      await this.makeRequest(`/posts/${id}`, 'DELETE');
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  async getPostById(id) {
    try {
      const post = await this.makeRequest(`/posts/${id}`, 'GET');
      return post;
    } catch (error) {
      console.error('Error getting post by ID:', error);
      return null;
    }
  },

  async searchPosts(query) {
    try {
      const posts = await this.getPosts();
      const lowerQuery = query.toLowerCase();
      return posts.filter(post =>
        post.title.toLowerCase().includes(lowerQuery) ||
        post.description.toLowerCase().includes(lowerQuery) ||
        post.category.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching posts:', error);
      return [];
    }
  },

  // ===== SETTINGS OPERATIONS =====
  
  async getSettings() {
    try {
      const settings = await this.makeRequest('/settings', 'GET');
      return settings;
    } catch (error) {
      console.error('Error reading settings:', error);
      return null;
    }
  },

  async updateSettings(settings) {
    try {
      const updatedSettings = {
        adsenseCode: settings.adsenseCode || '',
        analyticsCode: settings.analyticsCode || ''
      };

      await this.makeRequest('/settings', 'PUT', updatedSettings);
      return updatedSettings;
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
