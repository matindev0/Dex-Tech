// ===== STATIC SITE DATABASE =====
// Supports: Supabase (PostgreSQL cloud) and EMBEDDED_DATA fallback
// No cookies, localStorage, or site data usage.

const DB = {
  // Use Supabase if configured
  useSupabase: false,
  supabaseClient: null,
  
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
    // Try to initialize Supabase
    await this.initSupabase();
    
    // Load initial state
    await this.refreshState();
    
    if (this.useSupabase) {
      console.log('Database ready (Supabase mode - automatic sync enabled)');
    } else {
      console.log('Database ready (embedded data only)');
    }
  },

  // Initialize Supabase
  async initSupabase() {
    try {
      // Check if config is set
      if (typeof supabaseUrl === 'undefined' || 
          supabaseUrl === 'YOUR_SUPABASE_URL' ||
          typeof supabaseKey === 'undefined' ||
          supabaseKey === 'YOUR_SUPABASE_ANON_KEY' ||
          !supabaseUrl || !supabaseKey) {
        this.useSupabase = false;
        return;
      }

      // Load Supabase SDK from CDN
      if (typeof supabase === 'undefined') {
        await this.loadSupabaseSdk();
      }

      // Create Supabase client
      this.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
      this.useSupabase = true;
      console.log('Supabase initialized successfully');
    } catch (error) {
      console.warn('Supabase initialization failed, using embedded data:', error.message);
      this.useSupabase = false;
    }
  },

  // Load Supabase SDK from CDN
  async loadSupabaseSdk() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Supabase SDK'));
      document.head.appendChild(script);
    });
  },

  async refreshState() {
    // Try Supabase first
    if (this.useSupabase) {
      try {
        const data = await this.loadFromSupabase();
        if (data) {
          this.state = data;
          return this.state;
        }
      } catch (error) {
        console.warn('Supabase unavailable, falling back:', error.message);
        this.useSupabase = false;
      }
    }

    // Fallback to EMBEDDED_DATA only (no local storage)
    this.state.posts = (typeof EMBEDDED_DATA !== 'undefined' && Array.isArray(EMBEDDED_DATA.posts)) ? EMBEDDED_DATA.posts : [];
    this.state.settings = (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.settings) ? EMBEDDED_DATA.settings : this.state.settings;

    return this.state;
  },

  // ===== SUPABASE OPERATIONS =====
  mapPostFromSupabase(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      youtubeEmbed: row.youtube_embed || '',
      thumbnail: row.thumbnail || '',
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
    };
  },

  mapPostToSupabase(post) {
    return {
      id: post.id,
      title: post.title,
      description: post.description,
      category: post.category,
      youtube_embed: post.youtubeEmbed || null,
      thumbnail: post.thumbnail || null,
      created_at: post.createdAt,
      updated_at: post.updatedAt
    };
  },

  mapSettingsFromSupabase(row) {
    if (!row) return this.state.settings;
    return {
      adsenseCode: row.adsense_code || '',
      analyticsCode: row.analytics_code || '',
      lastModified: row.last_modified || new Date().toISOString()
    };
  },

  async loadFromSupabase() {
    if (!this.supabaseClient) return null;
    
    try {
      // Load posts
      const { data: posts, error: postsError } = await this.supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Load settings
      const { data: settingsData, error: settingsError } = await this.supabaseClient
        .from('settings')
        .select('*')
        .eq('id', 'appSettings')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      return {
        adminPin: this.state.adminPin,
        posts: (posts || []).map(row => this.mapPostFromSupabase(row)).filter(Boolean),
        settings: this.mapSettingsFromSupabase(settingsData)
      };
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      return null;
    }
  },

  async savePostsToSupabase(posts) {
    if (!this.supabaseClient) return false;
    
    try {
      const postsData = posts.map(post => this.mapPostToSupabase(post));
      const { error } = await this.supabaseClient
        .from('posts')
        .upsert(postsData, { onConflict: 'id' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving posts to Supabase:', error);
      return false;
    }
  },

  async saveSettingsToSupabase(settings) {
    if (!this.supabaseClient) return false;

    try {
      const { error } = await this.supabaseClient
        .from('settings')
        .upsert({
          id: 'appSettings',
          adsense_code: settings.adsenseCode,
          analytics_code: settings.analyticsCode,
          last_modified: settings.lastModified
        }, { onConflict: 'id' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving settings to Supabase:', error);
      return false;
    }
  },

  async deleteFromSupabase(id) {
    if (!this.supabaseClient) return false;

    try {
      const { error } = await this.supabaseClient
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting from Supabase:', error);
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

  generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString();
  },

  // ===== POSTS OPERATIONS =====
  async getPosts() {
    await this.refreshState();
    return [...this.state.posts];
  },

  async addPost(post) {
    const newPost = {
      id: this.generateId(),
      title: post.title || 'Untitled',
      description: post.description || '',
      category: post.category || 'general',
      youtubeEmbed: post.youtubeEmbed || '',
      thumbnail: post.thumbnail || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to state
    this.state.posts.unshift(newPost);
    this.state.settings.lastModified = newPost.createdAt;

    // Save to Supabase (if available)
    if (this.useSupabase) {
      await this.savePostsToSupabase(this.state.posts);
    }

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

    const index = this.state.posts.findIndex(p => p.id === id);
    if (index !== -1) {
      updated.createdAt = this.state.posts[index].createdAt;
      this.state.posts[index] = updated;
    }

    this.state.settings.lastModified = updated.updatedAt;

    if (this.useSupabase) {
      await this.savePostsToSupabase(this.state.posts);
    }

    return updated;
  },

  async deletePost(id) {
    this.state.posts = this.state.posts.filter(p => p.id !== id);
    this.state.settings.lastModified = new Date().toISOString();

    if (this.useSupabase) {
      await this.deleteFromSupabase(id);
    }

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
    this.state.settings = { ...this.state.settings, ...settings, lastModified: new Date().toISOString() };

    if (this.useSupabase) {
      await this.saveSettingsToSupabase(this.state.settings);
    }

    return this.state.settings;
  },

  // ===== EXPORT FUNCTIONS =====
  async exportAsCode() {
    await this.refreshState();
    const code = `// ===== EMBEDDED DATA STORAGE =====
// Generated: ${new Date().toISOString()}
// This file is auto-generated from the admin panel

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
  <!-- Posts Database - Auto-generated by Admin Panel -->
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
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
});
