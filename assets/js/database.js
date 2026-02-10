// ===== LOCAL DATABASE SYSTEM (FALLBACK + MONGODB SUPPORT) =====
// Stores data in localStorage locally, with MongoDB support when configured

const DB = {
  // Admin PIN
  adminPin: '3003',

  // Initialize database
  init() {
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
    // Ensure all posts have required fields
    this.migratePosts();
    console.log('✅ Database ready (localStorage)');
  },

  // Migrate posts to ensure all required fields exist
  migratePosts() {
    try {
      const posts = JSON.parse(localStorage.getItem('matin_posts')) || [];
      let needsSave = false;
      
      const migratedPosts = posts.map(post => {
        const migrated = { ...post };
        
        // Ensure createdAt exists
        if (!migrated.createdAt || typeof migrated.createdAt !== 'string') {
          migrated.createdAt = migrated.updatedAt || new Date().toISOString();
          needsSave = true;
        }
        
        // Ensure updatedAt exists
        if (!migrated.updatedAt || typeof migrated.updatedAt !== 'string') {
          migrated.updatedAt = new Date().toISOString();
          needsSave = true;
        }
        
        // Ensure id exists
        if (!migrated._id && !migrated.id) {
          migrated._id = Date.now().toString();
          needsSave = true;
        }
        
        return migrated;
      });
      
      if (needsSave) {
        localStorage.setItem('matin_posts', JSON.stringify(migratedPosts));
        console.log('✅ Posts migrated to include missing fields');
      }
    } catch (error) {
      console.error('Error during post migration:', error);
    }
  },

  // ===== POSTS OPERATIONS =====
  
  async getPosts() {
    try {
      return JSON.parse(localStorage.getItem('matin_posts')) || [];
    } catch (e) {
      console.error('Error reading posts:', e);
      return [];
    }
  },

  async addPost(post) {
    try {
      const posts = await this.getPosts();
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
      const posts = await this.getPosts();
      return posts.find(p => p._id === id || p.id === id) || null;
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
