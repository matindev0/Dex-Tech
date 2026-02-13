// ===== STATIC SITE DATABASE =====
// Supports: Node.js server, localStorage, and EMBEDDED_DATA fallback
// The Node.js server (db-server.js) provides automatic data persistence!

const DB = {
  // Use Node.js server if available
  useServer: true,
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
    
    if (this.useServer && this.serverUrl) {
      console.log('Database ready (Node.js server mode)');
    } else {
      console.log('Database ready (local mode)');
    }
  },

  // Detect if Node.js server is running
  detectServer() {
    // Check if we're on localhost with the Node.js server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Try common ports
      const port = window.location.port || '3000';
      this.serverUrl = `http://localhost:${port}`;
      this.useServer = true;
    } else {
      // On deployed site, server URL would need to be configured
      this.useServer = false;
      this.serverUrl = '';
    }
  },

  async refreshState() {
    // Try Node.js server first
    if (this.useServer && this.serverUrl) {
      try {
        const data = await this.request('/api/data');
        if (data) {
          this.state.adminPin = data.adminPin || this.state.adminPin;
          this.state.posts = Array.isArray(data.posts) ? data.posts : [];
          this.state.settings = data.settings || this.state.settings;
          return this.state;
        }
      } catch (error) {
        console.warn('Server unavailable, using local mode');
        this.useServer = false;
      }
    }

    // Fallback to localStorage
    const localPosts = this.loadFromLocalStorage('posts');
    const localSettings = this.loadFromLocalStorage('settings');
    
    if (localPosts && localPosts.length > 0) {
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

    // Try server first
    if (this.useServer && this.serverUrl) {
      try {
        const created = await this.request('/api/posts', 'POST', post);
        if (created) {
          await this.refreshState();
          return created;
        }
      } catch (error) {
        console.warn('Server save failed, using localStorage');
      }
    }

    // Fallback to localStorage
    this.state.posts.unshift(newPost);
    this.state.settings.lastModified = newPost.createdAt;
    this.saveToLocalStorage('posts', this.state.posts);
    this.saveToLocalStorage('settings', this.state.settings);
    
    return newPost;
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

    // Try server first
    if (this.useServer && this.serverUrl) {
      try {
        const result = await this.request(`/api/posts/${id}`, 'PUT', post);
        if (result) {
          await this.refreshState();
          return result;
        }
      } catch (error) {
        console.warn('Server update failed, using localStorage');
      }
    }

    // Fallback to localStorage
    const index = this.state.posts.findIndex(p => p.id === id);
    if (index !== -1) {
      updated.createdAt = this.state.posts[index].createdAt;
      this.state.posts[index] = updated;
    }
    this.state.settings.lastModified = updated.updatedAt;
    this.saveToLocalStorage('posts', this.state.posts);
    this.saveToLocalStorage('settings', this.state.settings);
    
    return updated;
  },

  async deletePost(id) {
    // Try server first
    if (this.useServer && this.serverUrl) {
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
    if (this.useServer && this.serverUrl) {
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
    if (this.useServer && this.serverUrl) {
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
