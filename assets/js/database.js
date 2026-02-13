// ===== STATIC SITE DATABASE =====
// Supports: Supabase (PostgreSQL cloud), localStorage, and EMBEDDED_DATA fallback
// Supabase provides automatic post saving - no manual export needed!

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
      console.log('Database ready (local mode - use SUPABASE_SETUP.md for auto-sync)');
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
      console.warn('Supabase initialization failed, using local mode:', error.message);
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

  // Check if Supabase is configured and working
  async isSupabaseAvailable() {
    if (!this.useSupabase || !this.supabaseClient) return false;
    try {
      const { error } = await this.supabaseClient.from('posts').select('id').limit(1);
      return !error;
    } catch (_) {
      return false;
    }
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

    // Fallback to post-data.html
    const postDataPosts = await this.loadFromPostDataHtml();
    if (postDataPosts && postDataPosts.length > 0) {
      this.state.posts = postDataPosts;
      return this.state;
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

  // ===== SUPABASE OPERATIONS =====
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
        posts: posts || [],
        settings: settingsData || this.state.settings
      };
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      return null;
    }
  },

  async saveToSupabase() {
    if (!this.supabaseClient) return false;
    
    try {
      // Save each post (upsert)
      const postsData = this.state.posts.map(post => ({
        id: post.id,
        title: post.title,
        description: post.description,
        category: post.category,
        youtube_embed: post.youtubeEmbed,
        thumbnail: post.thumbnail,
        created_at: post.createdAt,
        updated_at: post.updatedAt
      }));

      const { error: postsError } = await this.supabaseClient
        .from('posts')
        .upsert(postsData, { onConflict: 'id' });

      if (postsError) throw postsError;

      // Save settings
      const { error: settingsError } = await this.supabaseClient
        .from('settings')
        .upsert({
          id: 'appSettings',
          adsense_code: this.state.settings.adsenseCode,
          analytics_code: this.state.settings.analyticsCode,
          last_modified: this.state.settings.lastModified
        }, { onConflict: 'id' });

      if (settingsError) throw settingsError;

      console.log('Data saved to Supabase successfully');
      return true;
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      return false;
    }
  },

  // Load posts from post-data.html
  async loadFromPostDataHtml() {
    try {
      const response = await fetch('post-data.html');
      if (!response.ok) return null;
      const html = await response.text();
      
      const match = html.match(/window\.POSTS_DATA\s*=\s*(\[.*?\]);/s);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
      return null;
    } catch (_) {
      return null;
    }
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

    // Save to state
    this.state.posts.unshift(newPost);
    this.state.settings.lastModified = newPost.createdAt;

    // Save to Supabase (if available) AND localStorage
    if (this.useSupabase) {
      await this.saveToSupabase();
    }
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

    const index = this.state.posts.findIndex(p => p.id === id);
    if (index !== -1) {
      updated.createdAt = this.state.posts[index].createdAt;
      this.state.posts[index] = updated;
    }

    this.state.settings.lastModified = updated.updatedAt;

    if (this.useSupabase) {
      await this.saveToSupabase();
    }
    this.saveToLocalStorage('posts', this.state.posts);
    this.saveToLocalStorage('settings', this.state.settings);

    return updated;
  },

  async deletePost(id) {
    this.state.posts = this.state.posts.filter(p => p.id !== id);
    this.state.settings.lastModified = new Date().toISOString();

    if (this.useSupabase) {
      await this.saveToSupabase();
    }
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
    this.state.settings = { ...this.state.settings, ...settings, lastModified: new Date().toISOString() };

    if (this.useSupabase) {
      await this.saveToSupabase();
    }
    this.saveToLocalStorage('settings', this.state.settings);

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
