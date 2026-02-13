// ===== CODEBASE-BACKED STORAGE =====
// Posts/settings/images are saved directly into project files via server.js API.
// No external database integration is used.

const DB = {
  API_BASE: '',
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
    return this.state.adminPin || (typeof EMBEDDED_DATA !== 'undefined' ? EMBEDDED_DATA.adminPin : '3003');
  },

  async init() {
    this.clearLegacyLocalStorage();
    await this.refreshState();
    console.log('Database ready (codebase-backed file storage)');
  },

  clearLegacyLocalStorage() {
    try {
      localStorage.removeItem('matin_posts');
      localStorage.removeItem('matin_settings');
    } catch (_) {
      // Ignore environments where localStorage is unavailable.
    }
  },

  async request(path, method = 'GET', body) {
    const response = await fetch(`${this.API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;
      try {
        const payload = await response.json();
        if (payload && payload.error) errorMessage = payload.error;
      } catch (_) {
        // no-op
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  async refreshState() {
    try {
      const data = await this.request('/api/data');
      this.state.adminPin = data.adminPin || this.state.adminPin;
      this.state.posts = Array.isArray(data.posts) ? data.posts : [];
      this.state.settings = data.settings || this.state.settings;
      return this.state;
    } catch (error) {
      console.warn('API unavailable, using embedded fallback data:', error.message);
      this.state.adminPin = (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.adminPin) || this.state.adminPin;
      this.state.posts = (typeof EMBEDDED_DATA !== 'undefined' && Array.isArray(EMBEDDED_DATA.posts)) ? EMBEDDED_DATA.posts : [];
      this.state.settings = (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.settings) ? EMBEDDED_DATA.settings : this.state.settings;
      return this.state;
    }
  },

  // ===== POSTS OPERATIONS =====
  async getPosts() {
    await this.refreshState();
    return [...this.state.posts];
  },

  async addPost(post) {
    const created = await this.request('/api/posts', 'POST', post);
    await this.refreshState();
    return created;
  },

  async updatePost(id, post) {
    const updated = await this.request(`/api/posts/${encodeURIComponent(id)}`, 'PUT', post);
    await this.refreshState();
    return updated;
  },

  async deletePost(id) {
    await this.request(`/api/posts/${encodeURIComponent(id)}`, 'DELETE');
    await this.refreshState();
    return true;
  },

  async getPostById(id) {
    const posts = await this.getPosts();
    return posts.find(p => p.id === id || p._id === id) || null;
  },

  async searchPosts(query) {
    const posts = await this.getPosts();
    const lowerQuery = query.toLowerCase();
    return posts.filter(post =>
      (post.title && post.title.toLowerCase().includes(lowerQuery)) ||
      (post.description && post.description.toLowerCase().includes(lowerQuery)) ||
      (post.category && post.category.toLowerCase().includes(lowerQuery))
    );
  },

  // ===== SETTINGS OPERATIONS =====
  async getSettings() {
    await this.refreshState();
    return { ...this.state.settings };
  },

  async updateSettings(settings) {
    const updated = await this.request('/api/settings', 'PUT', settings);
    await this.refreshState();
    return updated;
  },

  // ===== IMAGE UPLOAD =====
  async uploadImage(file) {
    const dataUrl = await this.fileToBase64(file);
    const result = await this.request('/api/upload-image', 'POST', {
      filename: file.name,
      dataUrl
    });
    return result.path;
  },

  // ===== RESET =====
  async resetAll() {
    await this.request('/api/reset', 'POST');
    await this.refreshState();
    return true;
  },

  // ===== EXPORT FUNCTIONS =====
  async exportAsCode() {
    await this.refreshState();
    const code = `// ===== EMBEDDED DATA STORAGE =====\n// Generated: ${new Date().toISOString()}\n\nconst EMBEDDED_DATA = ${JSON.stringify({
      adminPin: this.state.adminPin,
      posts: this.state.posts,
      settings: this.state.settings
    }, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = EMBEDDED_DATA;\n}`;
    return code;
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
  }
};

document.addEventListener('DOMContentLoaded', () => {
  DB.init();
});
