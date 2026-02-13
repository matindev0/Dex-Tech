// ===== STATIC SITE DATABASE =====
// Supports: Node.js server, localStorage, and EMBEDDED_DATA fallback
// The Node.js server (db-server.js) provides automatic data persistence!

const DB = {
  // Use Node.js server if available
  useServer: true,
  // Empty string means 'same origin' (e.g. current domain)
  serverUrl: '',
  
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
    // Detect if running on server
    this.detectServer();
    
    // Load initial state
    await this.refreshState();
    
    if (this.useServer) {
      console.log('Database ready (Node.js server mode)');
    } else {
      console.log('Database ready (local mode)');
    }
  },

  // Detect API server endpoint
  detectServer() {
    const protocol = window.location.protocol;

    // Optional explicit API base override.
    if (typeof window.DEX_TECH_API_BASE === 'string' && window.DEX_TECH_API_BASE.trim()) {
      this.serverUrl = window.DEX_TECH_API_BASE.trim().replace(/\/+$/, '');
      this.useServer = true;
      return;
    }

    // Opening HTML directly from disk can still use a local API server.
    if (protocol === 'file:') {
      this.serverUrl = 'http://localhost:3000';
      this.useServer = true;
      return;
    }

    // Default: same-origin API (/api/*), works for localhost, LAN IP, and deployed domains.
    if (protocol === 'http:' || protocol === 'https:') {
      this.serverUrl = '';
      this.useServer = true;
      return;
    }

    this.serverUrl = '';
    this.useServer = false;
  },

  async refreshState() {
    // ALWAYS try Node.js server first - don't use localStorage cache
    if (this.useServer) {
      try {
        const data = await this.request('/api/data');
        if (data) {
          this.state.adminPin = data.adminPin || this.state.adminPin;
          this.state.posts = Array.isArray(data.posts) ? data.posts : [];
          this.state.settings = data.settings || this.state.settings;
          console.log('✅ Loaded data from server');
          return this.state;
        }
      } catch (error) {
        console.warn('⚠️ Server unavailable');
      }
    }

    // Only use localStorage fallback in file:// mode.
    // In http/https mode, silent local fallback causes per-user data drift.
    if (window.location.protocol !== 'file:') {
      return this.state;
    }

    // Only use localStorage if server is NOT available
    const localPosts = this.loadFromLocalStorage('posts');
    const localSettings = this.loadFromLocalStorage('settings');
    
    if (localPosts && localPosts.length > 0) {
      console.log('📁 Using cached posts from localStorage');
      this.state.posts = localPosts;
      this.state.settings = localSettings || this.state.settings;
    } else {
      // Fallback to EMBEDDED_DATA
      this.state.posts = (typeof EMBEDDED_DATA !== 'undefined' && Array.isArray(EMBEDDED_DATA.posts)) ? EMBEDDED_DATA.posts : [];
      this.state.settings = (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.settings) ? EMBEDDED_DATA.settings : this.state.settings;
    }

    return this.state;
  },

  // Make HTTP request to server
  async request(path, method = 'GET', body) {
    const url = this.serverUrl ? `${this.serverUrl}${path}` : path;
    
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  // ===== LOCAL STORAGE =====
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

  // ===== POSTS OPERATIONS =====
  async getPosts() {
    await this.refreshState();
    return [...this.state.posts];
  },

  async addPost(post) {
    // ONLY save to server - not localStorage
    if (this.useServer) {
      try {
        const created = await this.request('/api/posts', 'POST', post);
        if (created) {
          await this.refreshState();
          return created;
        }
      } catch (error) {
        console.error('❌ Failed to save post to server:', error.message);
        throw error;
      }
    }

    throw new Error('Server not available. Cannot save post.');
  },

  async updatePost(id, post) {
    // ONLY update on server - not localStorage
    if (this.useServer) {
      try {
        const result = await this.request(`/api/posts/${id}`, 'PUT', post);
        if (result) {
          await this.refreshState();
          return result;
        }
      } catch (error) {
        console.error('❌ Failed to update post on server:', error.message);
        throw error;
      }
    }

    throw new Error('Server not available. Cannot update post.');
  },

  async deletePost(id) {
    // Try server first
    if (this.useServer) {
      try {
        await this.request(`/api/posts/${id}`, 'DELETE');
        await this.refreshState();
        return true;
      } catch (error) {
        console.warn('Server delete failed, using localStorage');
      }
    }

    // Fallback to localStorage
    this.state.posts = this.state.posts.filter(p => p.id !== id);
    this.state.settings.lastModified = new Date().toISOString();
    this.saveToLocalStorage('posts', this.state.posts);
    this.saveToLocalStorage('settings', this.state.settings);
    
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
    // Try server first
    if (this.useServer) {
      try {
        const result = await this.request('/api/settings', 'PUT', settings);
        if (result) {
          await this.refreshState();
          return result;
        }
      } catch (error) {
        console.warn('Server settings update failed');
      }
    }

    // Fallback to localStorage
    this.state.settings = { ...this.state.settings, ...settings, lastModified: new Date().toISOString() };
    this.saveToLocalStorage('settings', this.state.settings);
    return this.state.settings;
  },

  // ===== EXPORT FUNCTIONS =====
  async exportAsCode() {
    await this.refreshState();
    const code = `// ===== EMBEDDED DATA STORAGE =====
// Generated: ${new Date().toISOString()}

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

  async copyCodeToClipboard() {
    const code = await this.exportAsCode();
    try {
      await navigator.clipboard.writeText(code);
      return true;
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  },

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
  <!-- Posts Database -->
  <!-- Generated: ${new Date().toISOString()} -->
  
  <script>
    window.POSTS_DATA = ${JSON.stringify(this.state.posts, null, 2)};
    window.POSTS_SETTINGS = ${JSON.stringify(this.state.settings, null, 2)};
  <\/script>
</body>
</html>`;
    return html;
  },

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

  async uploadImage(file) {
    const dataUrl = await this.fileToBase64(file);
    return dataUrl;
  },

  // ===== RESET =====
  async resetAll() {
    if (this.useServer) {
      try {
        await this.request('/api/reset', 'POST');
        await this.refreshState();
        return true;
      } catch (error) {
        console.warn('Server reset failed');
      }
    }

    // Local reset
    this.state.posts = [];
    this.state.settings = {
      adsenseCode: '',
      analyticsCode: '',
      lastModified: new Date().toISOString()
    };
    localStorage.removeItem('dex_tech_posts');
    localStorage.removeItem('dex_tech_settings');
    return true;
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
});
