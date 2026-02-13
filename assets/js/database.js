// ===== STATIC SITE DATABASE =====
// Works without Node.js - uses localStorage for admin, EMBEDDED_DATA for public site
// Posts are exported as code and committed to assets/js/data.js

const DB = {
  // Static mode: true when no API server is available
  staticMode: false,
  
  state: {
    adminPin: '3003',
    posts: [],
    settings: {
      adsenseCode: '',
      analyticsCode: '',
      lastModified: new Date().toISOString()
    }
  },

  get adminPin() {
    if (this.state.adminPin && this.state.adminPin !== '3003') {
      return this.state.adminPin;
    }
    return typeof EMBEDDED_DATA !== 'undefined' ? EMBEDDED_DATA.adminPin : '3003';
  },

  async init() {
    await this.refreshState();
    console.log('Database ready (static mode: ' + this.staticMode + ')');
  },

  // Check if API server is available
  async isApiAvailable() {
    try {
      const response = await fetch('/api/data', { method: 'HEAD', cache: 'no-store' });
      return response.ok;
    } catch (_) {
      return false;
    }
  },

  async refreshState() {
    // First try API server
    if (!this.staticMode) {
      try {
        const data = await this.request('/api/data');
        this.state.adminPin = data.adminPin || this.state.adminPin;
        this.state.posts = Array.isArray(data.posts) ? data.posts : [];
        this.state.settings = data.settings || this.state.settings;
        this.staticMode = false;
        return this.state;
      } catch (error) {
        console.warn('API unavailable, switching to static mode:', error.message);
        this.staticMode = true;
      }
    }

    // Static mode: try multiple sources in priority order
    if (this.staticMode) {
      // 1. Try loading from post-data.html (local database file)
      const postDataPosts = await this.loadFromPostDataHtml();
      if (postDataPosts && postDataPosts.length > 0) {
        this.state.posts = postDataPosts;
        // Also try to load settings from post-data.html
        const postDataSettings = await this.loadSettingsFromPostDataHtml();
        if (postDataSettings) {
          this.state.settings = postDataSettings;
        }
        return this.state;
      }

      // 2. Try localStorage
      const localPosts = this.loadFromLocalStorage('posts');
      const localSettings = this.loadFromLocalStorage('settings');
      
      if (localPosts && localPosts.length > 0) {
        this.state.posts = localPosts;
        this.state.settings = localSettings || this.state.settings;
        return this.state;
      }

      // 3. Fallback to EMBEDDED_DATA
      this.state.posts = (typeof EMBEDDED_DATA !== 'undefined' && Array.isArray(EMBEDDED_DATA.posts)) ? EMBEDDED_DATA.posts : [];
      this.state.settings = (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.settings) ? EMBEDDED_DATA.settings : this.state.settings;
    }

    return this.state;
  },

  // Load posts from post-data.html
  async loadFromPostDataHtml() {
    try {
      const response = await fetch('post-data.html');
      if (!response.ok) return null;
      const html = await response.text();
      
      // Extract POSTS_DATA from the HTML
      const match = html.match(/window\.POSTS_DATA\s*=\s*(\[.*?\]);/s);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
      return null;
    } catch (_) {
      return null;
    }
  },

  // Load settings from post-data.html
  async loadSettingsFromPostDataHtml() {
    try {
      const response = await fetch('post-data.html');
      if (!response.ok) return null;
      const html = await response.text();
      
      // Extract POSTS_SETTINGS from the HTML
      const match = html.match(/window\.POSTS_SETTINGS\s*=\s*(\{.*?\});/s);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
      return null;
    } catch (_) {
      return null;
    }
  },

  // LocalStorage helpers
  loadFromLocalStorage(key) {
    try {
      const data = localStorage.getItem('dex_tech_' + key);
      return data ? JSON.parse(data) : null;
    } catch (_) {
      return null;
    }
  },

  saveToLocalStorage(key, value) {
    try {
      localStorage.setItem('dex_tech_' + key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  },

  async request(path, method = 'GET', body) {
    const response = await fetch(`${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  // ===== POSTS OPERATIONS =====
  async getPosts() {
    await this.refreshState();
    return [...this.state.posts];
  },

  async addPost(post) {
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

    if (this.staticMode) {
      this.state.posts.push(newPost);
      this.saveToLocalStorage('posts', this.state.posts);
      this.state.settings.lastModified = newPost.createdAt;
      this.saveToLocalStorage('settings', this.state.settings);
      return newPost;
    }

    return await this.request('/api/posts', 'POST', post);
  },

  async updatePost(id, post) {
    const updated = {
      id,
      title: post.title || '',
      description: post.description || '',
      category: post.category || '',
      youtubeEmbed: post.youtubeEmbed || '',
      thumbnail: post.thumbnail || '',
      updatedAt: new Date().toISOString()
    };

    if (this.staticMode) {
      const index = this.state.posts.findIndex(p => p.id === id);
      if (index !== -1) {
        updated.createdAt = this.state.posts[index].createdAt;
        this.state.posts[index] = updated;
        this.saveToLocalStorage('posts', this.state.posts);
        this.state.settings.lastModified = updated.updatedAt;
        this.saveToLocalStorage('settings', this.state.settings);
      }
      return updated;
    }

    return await this.request(`/api/posts/${encodeURIComponent(id)}`, 'PUT', post);
  },

  async deletePost(id) {
    if (this.staticMode) {
      this.state.posts = this.state.posts.filter(p => p.id !== id);
      this.saveToLocalStorage('posts', this.state.posts);
      this.state.settings.lastModified = new Date().toISOString();
      this.saveToLocalStorage('settings', this.state.settings);
      return true;
    }

    await this.request(`/api/posts/${encodeURIComponent(id)}`, 'DELETE');
    return true;
  },

  async getPostById(id) {
    const posts = await this.getPosts();
    return posts.find(p => p.id === id || p._id === id) || null;
  },

  // ===== SETTINGS OPERATIONS =====
  async getSettings() {
    await this.refreshState();
    return { ...this.state.settings };
  },

  async updateSettings(settings) {
    if (this.staticMode) {
      this.state.settings = { ...this.state.settings, ...settings, lastModified: new Date().toISOString() };
      this.saveToLocalStorage('settings', this.state.settings);
      return this.state.settings;
    }

    return await this.request('/api/settings', 'PUT', settings);
  },

  // ===== EXPORT AS CODE =====
  async exportAsCode() {
    await this.refreshState();
    const code = `// ===== EMBEDDED DATA STORAGE =====
// Generated: ${new Date().toISOString()}
// This file is auto-generated from the admin panel
// DO NOT EDIT MANUALLY - Use admin.html to add posts

const EMBEDDED_DATA = {
  adminPin: '${this.state.adminPin}',

  posts: ${JSON.stringify(this.state.posts, null, 2)},

  settings: ${JSON.stringify(this.state.settings, null, 2)}
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EMBEDDED_DATA;
}
`;
    return code;
  },

  // Copy code to clipboard
  async copyCodeToClipboard() {
    const code = await this.exportAsCode();
    try {
      await navigator.clipboard.writeText(code);
      return true;
    } catch (_) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  },

  // Download code as file
  downloadCodeFile() {
    this.exportAsCode().then(code => {
      const blob = new Blob([code], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'data.js';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  },

  // ===== EXPORT/IMPORT POST-DATA.HTML =====
  async exportAsPostDataHtml() {
    await this.refreshState();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Posts Database</title>
</head>
<body>
  <!-- Posts Database - Auto-generated by Admin Panel -->
  <!-- Generated: ${new Date().toISOString()} -->
  <!-- DO NOT EDIT MANUALLY - Use admin.html to add posts -->
  
  <script>
    // Posts data stored as JavaScript array
    window.POSTS_DATA = ${JSON.stringify(this.state.posts, null, 2)};
    
    // Settings data
    window.POSTS_SETTINGS = ${JSON.stringify(this.state.settings, null, 2)};
  <\/script>
</body>
</html>`;
    return html;
  },

  // Download post-data.html
  downloadPostDataHtml() {
    this.exportAsPostDataHtml().then(html => {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'post-data.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  },

  // Copy post-data.html code to clipboard
  async copyPostDataHtml() {
    const html = await this.exportAsPostDataHtml();
    try {
      await navigator.clipboard.writeText(html);
      return true;
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = html;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  },

  // ===== YOUTUBE UTILITIES =====
  extractVideoId(url) {
    if (!url) return null;

    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
      return url.trim();
    }

    const input = String(url).trim();

    const iframeMatch = input.match(/(<iframe[\s\S]*?<\/iframe>)/i);
    if (iframeMatch && iframeMatch[1]) {
      return iframeMatch[1].trim();
    }

    const embedMatch = input.match(/https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:[?&][^\s]*)?/i);
    if (embedMatch) {
      const urlOnly = input.match(/https?:\/\/(?:www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}(?:[?&][^\s]*)?/i)[0];
      return urlOnly;
    }

    let videoIdMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i);
    if (videoIdMatch) return videoIdMatch[1];

    videoIdMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (videoIdMatch) return videoIdMatch[1];

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

  // Upload image - saves to browser for static mode
  async uploadImage(file) {
    const dataUrl = await this.fileToBase64(file);
    
    if (this.staticMode) {
      // For static mode, return the data URL directly as the image path
      // Images will be embedded as base64 (for small images)
      return dataUrl;
    }

    // For server mode, upload to server
    const result = await this.request('/api/upload-image', 'POST', {
      filename: file.name,
      dataUrl
    });
    return result.path;
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
});
