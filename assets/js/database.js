// ===== LOCAL DATABASE SYSTEM =====
// ===== LOCAL DATABASE SYSTEM =====
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
  },

  // ===== POSTS OPERATIONS =====
  getPosts() {
    try {
      return JSON.parse(localStorage.getItem('matin_posts')) || [];
    } catch (e) {
      console.error('Error reading posts:', e);
      return [];
    }
  },

  addPost(post) {
    const posts = this.getPosts();
    const newPost = {
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
  },

  updatePost(id, post) {
    const posts = this.getPosts();
    const index = posts.findIndex(p => p.id === id);
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
  },

  deletePost(id) {
    const posts = this.getPosts();
    const filteredPosts = posts.filter(p => p.id !== id);
    localStorage.setItem('matin_posts', JSON.stringify(filteredPosts));
    return true;
  },

  getPostById(id) {
    const posts = this.getPosts();
    return posts.find(p => p.id === id) || null;
  },

  searchPosts(query) {
    const posts = this.getPosts();
    const lowerQuery = query.toLowerCase();
    return posts.filter(post =>
      post.title.toLowerCase().includes(lowerQuery) ||
      post.description.toLowerCase().includes(lowerQuery) ||
      post.category.toLowerCase().includes(lowerQuery)
    );
  },

  // ===== SETTINGS OPERATIONS =====
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem('matin_settings')) || {};
    } catch (e) {
      console.error('Error reading settings:', e);
      return {};
    }
  },

  updateSettings(settings) {
    const currentSettings = this.getSettings();
    const updatedSettings = {
      ...currentSettings,
      ...settings,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem('matin_settings', JSON.stringify(updatedSettings));
    return updatedSettings;
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
      // return the full URL (without surrounding attributes)
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
  }
};

// Initialize database on page load
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
});
  
