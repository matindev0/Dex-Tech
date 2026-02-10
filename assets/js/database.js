// ===== CLOUD DATABASE SYSTEM (Backend API + LocalStorage Fallback) =====
// Syncs data with backend server for cross-device access
// Falls back to localStorage when offline

const DB = {
  // Admin PIN
  adminPin: '3003',
  
  // API Configuration
  API_BASE_URL: window.location.origin, // Uses current domain
  
  // Detect if backend is available
  isOffline: false,
  lastCheckTime: 0,

  // Initialize database
  async init() {
    // Check if backend is reachable
    await this.checkBackendAvailability();
    
    // Initialize localStorage as fallback
    if (!localStorage.getItem('matin_posts')) {
      localStorage.setItem('matin_posts', JSON.stringify([]));
    }
    if (!localStorage.getItem('matin_settings')) {
      localStorage.setItem('matin_settings', JSON.stringify({
        adsenseCode: '',
        analyticsCode: '',
        lastModified: new Date().toISOString()
      }));
    }
    
    console.log(`✅ Database ready (${this.isOffline ? 'Offline Mode - localStorage' : 'Online Mode - API Backend'})`);
  },

  // Check if backend API is available
  async checkBackendAvailability() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/posts`, { 
        method: 'GET',
        timeout: 5000 
      });
      this.isOffline = !response.ok;
    } catch (error) {
      console.log('⚠️ Backend unavailable, using offline mode');
      this.isOffline = true;
    }
  },

  // ===== POSTS OPERATIONS =====
  
  async getPosts() {
    try {
      // Try backend first if online
      if (!this.isOffline) {
        try {
          const response = await fetch(`${this.API_BASE_URL}/api/posts`);
          if (response.ok) {
            const data = await response.json();
            const posts = data.documents || data || [];
            // Sync to localStorage as cache
            localStorage.setItem('matin_posts', JSON.stringify(posts));
            return posts;
          }
        } catch (err) {
          console.warn('Failed to fetch from backend, using cache:', err);
          this.isOffline = true;
        }
      }
      
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('matin_posts')) || [];
    } catch (e) {
      console.error('Error reading posts:', e);
      return [];
    }
  },

  async addPost(post) {
    try {
      const newPost = {
        _id: Date.now().toString(),
        id: Date.now().toString(),
        title: post.title,
        description: post.description,
        category: post.category,
        youtubeEmbed: post.youtubeEmbed,
        thumbnail: post.thumbnail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Try backend first if online
      if (!this.isOffline) {
        try {
          const response = await fetch(`${this.API_BASE_URL}/api/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPost)
          });
          if (response.ok) {
            console.log('✅ Post saved to backend');
            return newPost;
          }
        } catch (err) {
          console.warn('Failed to save to backend, using localStorage:', err);
          this.isOffline = true;
        }
      }
      
      // Fallback: save to localStorage
      const posts = await this.getPosts();
      posts.push(newPost);
      localStorage.setItem('matin_posts', JSON.stringify(posts));
      return newPost;
    } catch (error) {
      console.error('Error adding post:', error);
      throw error;
    }
  },

  async updatePost(id, post) {
    try {
      // Try backend first if online
      if (!this.isOffline) {
        try {
          const response = await fetch(`${this.API_BASE_URL}/api/posts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(post)
          });
          if (response.ok) {
            console.log('✅ Post updated on backend');
            const updated = await response.json();
            return updated;
          }
        } catch (err) {
          console.warn('Failed to update on backend, using localStorage:', err);
          this.isOffline = true;
        }
      }
      
      // Fallback: update localStorage
      const posts = await this.getPosts();
      const index = posts.findIndex(p => p._id === id || p.id === id);
      if (index !== -1) {
        posts[index] = {
          ...posts[index],
          title: post.title,
          description: post.description,
          category: post.category,
          youtubeEmbed: post.youtubeEmbed,
          thumbnail: post.thumbnail,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('matin_posts', JSON.stringify(posts));
        return posts[index];
      }
      return null;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  async deletePost(id) {
    try {
      // Try backend first if online
      if (!this.isOffline) {
        try {
          const response = await fetch(`${this.API_BASE_URL}/api/posts/${id}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            console.log('✅ Post deleted from backend');
          }
        } catch (err) {
          console.warn('Failed to delete from backend, using localStorage:', err);
          this.isOffline = true;
        }
      }
      
      // Fallback: delete from localStorage
      const posts = await this.getPosts();
      const filteredPosts = posts.filter(p => p._id !== id && p.id !== id);
      localStorage.setItem('matin_posts', JSON.stringify(filteredPosts));
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  async getPostById(id) {
    try {
      console.log('📍 Searching for post with ID:', id);
      
      // Try backend first if online
      if (!this.isOffline) {
        try {
          const response = await fetch(`${this.API_BASE_URL}/api/posts/${id}`);
          if (response.ok) {
            const post = await response.json();
            console.log('🎯 Found post from backend:', post);
            return post;
          }
        } catch (err) {
          console.warn('Failed to fetch from backend, using cache:', err);
          this.isOffline = true;
        }
      }
      
      // Fallback to localStorage
      const posts = await this.getPosts();
      console.log('📚 Total posts in cache:', posts.length);
      
      if (posts.length > 0) {
        console.log('📍 Posts IDs:', posts.map(p => ({ _id: p._id, id: p.id })));
      }
      
      const found = posts.find(p => p._id === id || p.id === id);
      console.log('🎯 Found post from cache:', found);
      return found || null;
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
        (post.title && post.title.toLowerCase().includes(lowerQuery)) ||
        (post.description && post.description.toLowerCase().includes(lowerQuery)) ||
        (post.category && post.category.toLowerCase().includes(lowerQuery))
      );
    } catch (error) {
      console.error('Error searching posts:', error);
      return [];
    }
  },

  // ===== SETTINGS OPERATIONS =====
  
  async getSettings() {
    try {
      // Try backend first if online
      if (!this.isOffline) {
        try {
          const response = await fetch(`${this.API_BASE_URL}/api/settings`);
          if (response.ok) {
            const data = await response.json();
            const settings = data.document || data || {};
            // Sync to localStorage as cache
            localStorage.setItem('matin_settings', JSON.stringify(settings));
            return settings;
          }
        } catch (err) {
          console.warn('Failed to fetch settings from backend:', err);
          this.isOffline = true;
        }
      }
      
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('matin_settings')) || {};
    } catch (e) {
      console.error('Error reading settings:', e);
      return {};
    }
  },

  async updateSettings(settings) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        lastModified: new Date().toISOString()
      };
      
      // Try backend first if online
      if (!this.isOffline) {
        try {
          const response = await fetch(`${this.API_BASE_URL}/api/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSettings)
          });
          if (response.ok) {
            console.log('✅ Settings saved to backend');
            return updatedSettings;
          }
        } catch (err) {
          console.warn('Failed to save settings to backend:', err);
          this.isOffline = true;
        }
      }
      
      // Fallback: save to localStorage
      localStorage.setItem('matin_settings', JSON.stringify(updatedSettings));
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
