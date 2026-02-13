// ===== EMBEDDED DATA STORAGE =====
// All posts, images, and settings are stored directly in this file
// No database or backend required
// Images are base64 encoded for easy portability

const EMBEDDED_DATA = {
  // Admin PIN - Change this to your preferred PIN
  adminPin: '3003',

  // All posts stored inline
  posts: [
    {
      id: '1',
      title: 'Welcome to My Portfolio',
      description: 'This is my first post. Learn more about my projects and experience.',
      category: 'general',
      youtubeEmbed: '',
      thumbnail: '', // Base64 image data or empty
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Add more posts here
  ],

  // Global settings
  settings: {
    adsenseCode: '',
    analyticsCode: '',
    lastModified: new Date().toISOString()
  },

  // Helper function to add a post
  addPost(post) {
    const newPost = {
      id: Date.now().toString(),
      title: post.title || 'Untitled',
      description: post.description || '',
      category: post.category || 'general',
      youtubeEmbed: post.youtubeEmbed || '',
      thumbnail: post.thumbnail || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.posts.push(newPost);
    return newPost;
  },

  // Helper function to update a post
  updatePost(id, updates) {
    const post = this.posts.find(p => p.id === id);
    if (post) {
      Object.assign(post, updates, {
        updatedAt: new Date().toISOString()
      });
      return post;
    }
    return null;
  },

  // Helper function to delete a post
  deletePost(id) {
    const index = this.posts.findIndex(p => p.id === id);
    if (index > -1) {
      this.posts.splice(index, 1);
      return true;
    }
    return false;
  },

  // Helper function to get a post by ID
  getPostById(id) {
    return this.posts.find(p => p.id === id);
  },

  // Get all posts
  getAllPosts() {
    return this.posts;
  },

  // Export data as JSON for backup
  exportAsJSON() {
    return JSON.stringify({
      posts: this.posts,
      settings: this.settings,
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  // Verify admin PIN
  verifyPin(pin) {
    return pin === this.adminPin;
  },

  // Update settings
  updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings,
      lastModified: new Date().toISOString()
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EMBEDDED_DATA;
}
