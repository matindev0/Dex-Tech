// ===== ADMIN PANEL FUNCTIONALITY =====

class AdminPanel {
  constructor() {
    this.pinModal = document.getElementById('pinModal');
    this.adminContainer = document.getElementById('adminContainer');
    this.pinForm = document.getElementById('pinForm');
    this.pinInput = document.getElementById('pinInput');
    this.pinError = document.getElementById('pinError');
    this.isAuthenticated = false;
    this.currentEditId = null;

    this.init();
  }

  init() {
    this.setupPinAuthentication();
    this.setupTabNavigation();
    this.setupPostManagement();
    this.setupSettings();
    this.checkSessionStorage();
  }

  checkSessionStorage() {
    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
      this.authenticate();
    }
  }

  setupPinAuthentication() {
    if (!this.pinForm) return;

    this.pinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pin = this.pinInput.value.trim();

      try {
        if (typeof DB !== 'undefined' && DB.verifyPin && DB.verifyPin(pin)) {
          sessionStorage.setItem('adminAuthenticated', 'true');
          this.authenticate();
        } else {
          this.pinError.textContent = 'Invalid PIN. Please try again.';
          this.pinError.style.display = 'block';
          this.pinInput.value = '';
          this.pinInput.focus();
        }
      } catch (err) {
        console.error('PIN verification error:', err);
        this.pinError.textContent = 'An error occurred. Check console.';
        this.pinError.style.display = 'block';
      }
    });

    this.pinInput.addEventListener('input', () => {
      this.pinError.style.display = 'none';
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  }

  async authenticate() {
    this.isAuthenticated = true;
    if (this.pinModal) this.pinModal.style.display = 'none';
    if (this.adminContainer) this.adminContainer.style.display = 'block';
    await this.loadPostsList();
    await this.loadSettings();
  }

  logout() {
    sessionStorage.removeItem('adminAuthenticated');
    this.isAuthenticated = false;
    if (this.adminContainer) this.adminContainer.style.display = 'none';
    if (this.pinModal) this.pinModal.style.display = 'flex';
    if (this.pinForm) this.pinForm.reset();
    if (this.pinError) this.pinError.style.display = 'none';
  }

  setupTabNavigation() {
    const navItems = document.querySelectorAll('.admin__nav-item');
    const tabs = document.querySelectorAll('.admin__tab');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tabName = item.getAttribute('data-tab');
        navItems.forEach(i => i.classList.remove('active'));
        tabs.forEach(t => t.classList.remove('active'));
        item.classList.add('active');
        const el = document.getElementById(tabName + 'Tab');
        if (el) el.classList.add('active');
        if (tabName === 'settings') this.loadSettings();
      });
    });
  }

  setupPostManagement() {
    const addBtn = document.getElementById('addPostBtn');
    if (addBtn) addBtn.addEventListener('click', () => { this.currentEditId = null; this.openPostForm(); });

    const postForm = document.getElementById('postForm');
    if (postForm) postForm.addEventListener('submit', (e) => { e.preventDefault(); this.savePost(); });

    const closeModal = document.getElementById('closeModal');
    if (closeModal) closeModal.addEventListener('click', () => this.closePostForm());
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closePostForm());
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.addEventListener('click', () => this.closePostForm());

    this.setupFileUpload();

    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
    const deleteOverlay = document.getElementById('deleteOverlay');
    if (deleteOverlay) deleteOverlay.addEventListener('click', () => this.closeDeleteModal());
  }

  setupFileUpload() {
    const fileInput = document.getElementById('postThumbnail');
    const fileLabel = document.querySelector('.file-upload__label');
    const preview = document.getElementById('thumbnailPreview');
    const previewImg = document.getElementById('thumbnailPreviewImg');
    const removeBtn = document.getElementById('removeThumbnail');

    if (!fileInput) return;

    fileInput.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files[0], preview, previewImg);
    });

    if (fileLabel) {
      fileLabel.addEventListener('dragover', (e) => { e.preventDefault(); fileLabel.style.borderColor = 'var(--first-color)'; fileLabel.style.backgroundColor = 'rgba(65, 88, 208, 0.15)'; });
      fileLabel.addEventListener('dragleave', () => { fileLabel.style.borderColor = ''; fileLabel.style.backgroundColor = ''; });
      fileLabel.addEventListener('drop', (e) => {
        e.preventDefault(); fileLabel.style.borderColor = ''; fileLabel.style.backgroundColor = ''; const files = e.dataTransfer.files; if (files.length > 0) { fileInput.files = files; this.handleFileSelect(files[0], preview, previewImg); }
      });
    }

    if (removeBtn) removeBtn.addEventListener('click', () => { fileInput.value = ''; if (preview) preview.style.display = 'none'; if (previewImg) previewImg.src = ''; });
  }

  handleFileSelect(file, preview, previewImg) {
    if (!file) return;
    if (file && file.type && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (previewImg) previewImg.src = e.target.result;
        if (preview) preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      this.showToast('Please select a valid image file', 'error');
    }
  }

  setupSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());

    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) exportDataBtn.addEventListener('click', () => this.exportAsJSON());

    const exportCodeBtn = document.getElementById('exportCodeBtn');
    if (exportCodeBtn) exportCodeBtn.addEventListener('click', () => this.exportAsCode());

    const resetBtn = document.getElementById('resetDataBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetData());
  }

  openPostForm(postId = null) {
    const modal = document.getElementById('postFormModal');
    const form = document.getElementById('postForm');
    const title = document.getElementById('formTitle');
    const fileInput = document.getElementById('postThumbnail');
    const preview = document.getElementById('thumbnailPreview');

    if (form) form.reset();
    if (fileInput) fileInput.value = '';
    if (preview) preview.style.display = 'none';

    if (postId) {
      this.currentEditId = postId;
      DB.getPostById(postId).then(post => {
        if (post) {
          if (title) title.textContent = 'Edit Post';
          document.getElementById('postTitle').value = post.title || '';
          document.getElementById('postDescription').value = post.description || '';
          document.getElementById('postCategory').value = post.category || '';
          if (post.youtubeEmbed) {
            const ye = String(post.youtubeEmbed);
            if (ye.startsWith('http') || ye.startsWith('<iframe')) {
              document.getElementById('postYoutube').value = ye;
            } else {
              document.getElementById('postYoutube').value = `https://www.youtube.com/watch?v=${ye}`;
            }
          } else {
            document.getElementById('postYoutube').value = '';
          }
          if (post.thumbnail) {
            const previewImg = document.getElementById('thumbnailPreviewImg');
            if (previewImg) previewImg.src = post.thumbnail;
            if (preview) preview.style.display = 'block';
          }
        }
      }).catch(err => console.error('Load post for edit error:', err));
    } else {
      this.currentEditId = null;
      if (title) title.textContent = 'Add New Post';
    }

    if (modal) modal.style.display = 'flex';
  }

  closePostForm() {
    const modal = document.getElementById('postFormModal');
    const form = document.getElementById('postForm');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    this.currentEditId = null;
  }

  async savePost() {
    const titleInput = document.getElementById('postTitle').value.trim();
    const descriptionInput = document.getElementById('postDescription').value.trim();
    const categoryInput = document.getElementById('postCategory').value.trim();
    const youtubeInput = document.getElementById('postYoutube').value.trim();
    const thumbnailFile = document.getElementById('postThumbnail');

    if (!titleInput || !descriptionInput || !categoryInput) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }

    if (!this.currentEditId && (!thumbnailFile || !thumbnailFile.files || !thumbnailFile.files.length)) {
      this.showToast('Please upload a thumbnail image', 'error');
      return;
    }

    let videoId = '';
    if (youtubeInput) {
      videoId = DB.extractVideoId(youtubeInput);
      if (!videoId) {
        this.showToast('Invalid YouTube URL. Please enter a valid YouTube link.', 'error');
        return;
      }
    }

    try {
      if (thumbnailFile && thumbnailFile.files && thumbnailFile.files.length > 0) {
        const file = thumbnailFile.files[0];
        const imagePath = await DB.uploadImage(file);
        await this.completeSavePost(titleInput, descriptionInput, categoryInput, videoId, imagePath);
      } else if (this.currentEditId) {
        const existingPost = await DB.getPostById(this.currentEditId);
        await this.completeSavePost(titleInput, descriptionInput, categoryInput, videoId, existingPost.thumbnail);
      }
    } catch (error) {
      console.error('Save post error:', error);
      this.showToast('Error saving post. Please try again.', 'error');
    }
  }

  async completeSavePost(title, description, category, videoId, thumbnail) {
    const post = { title, description, category, youtubeEmbed: videoId, thumbnail };
    try {
      if (this.currentEditId) {
        await DB.updatePost(this.currentEditId, post);
        this.showToast('Post updated successfully!', 'success');
      } else {
        await DB.addPost(post);
        this.showToast('Post added successfully!', 'success');
      }
      this.closePostForm();
      await this.loadPostsList();
    } catch (err) {
      console.error('Complete save post error:', err);
      this.showToast('Error saving post to project files. Please try again.', 'error');
    }
  }

  async loadPostsList() {
    try {
      const posts = await DB.getPosts();
      const container = document.getElementById('postsListContainer');
      if (!container) return;

      if (!posts || posts.length === 0) {
        container.innerHTML = `\n          <div class="admin__empty">\n            <i class='bx bx-inbox'></i>\n            <p>No posts yet. Create your first post!</p>\n          </div>\n        `;
        return;
      }

      container.innerHTML = posts.map(post => this.createPostListItem(post)).join('');

      document.querySelectorAll('.admin__post-edit').forEach(btn => {
        btn.addEventListener('click', () => { this.openPostForm(btn.getAttribute('data-id')); });
      });

      document.querySelectorAll('.admin__post-delete').forEach(btn => {
        btn.addEventListener('click', () => { this.currentEditId = btn.getAttribute('data-id'); this.openDeleteModal(); });
      });
    } catch (err) {
      console.error('Load posts error:', err);
    }
  }

  createPostListItem(post) {
    const formatDate = (date) => {
      if (!date) return 'Invalid Date';
      try {
        return new Date(date).toLocaleString();
      } catch { return 'Invalid Date'; }
    };

    const id = post._id || post.id || '';
    return `
      <div class="admin__post-item">
        <div class="admin__post-info">
          <h3 class="admin__post-title">${this.escapeHtml(post.title || '')}</h3>
          <p class="admin__post-category">
            <span class="admin__post-category-badge">${this.escapeHtml(post.category || '')}</span>
          </p>
          <p class="admin__post-description">${this.escapeHtml((post.description || '').substring(0, 100))}...</p>
          <small class="admin__post-date">Created: ${formatDate(post.createdAt)}</small>
        </div>
        <div class="admin__post-actions">
          <button class="admin__post-edit" data-id="${id}" title="Edit"><i class='bx bx-edit'></i></button>
          <button class="admin__post-delete" data-id="${id}" title="Delete"><i class='bx bx-trash'></i></button>
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    return String(str).replace(/[&<>"]+/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s] || s));
  }

  openDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) confirmBtn.onclick = () => this.deletePost();
  }

  closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (!modal) return;
    modal.style.display = 'none';
    this.currentEditId = null;
  }

  async deletePost() {
    if (!this.currentEditId) return;
    try {
      await DB.deletePost(this.currentEditId);
      this.showToast('Post deleted successfully!', 'success');
      this.closeDeleteModal();
      await this.loadPostsList();
      this.currentEditId = null;
    } catch (err) {
      console.error('Delete post error:', err);
      this.showToast('Error deleting post. Please try again.', 'error');
    }
  }

  async loadSettings() {
    try {
      const settings = await DB.getSettings();
      document.getElementById('adsenseCode').value = settings?.adsenseCode || '';
      document.getElementById('analyticsCode').value = settings?.analyticsCode || '';
    } catch (err) {
      console.error('Load settings error:', err);
    }
  }

  async saveSettings() {
    try {
      const settings = {
        adsenseCode: document.getElementById('adsenseCode').value,
        analyticsCode: document.getElementById('analyticsCode').value
      };
      await DB.updateSettings(settings);
      this.showToast('Settings saved successfully!', 'success');
    } catch (err) {
      console.error('Save settings error:', err);
      this.showToast('Error saving settings. Please try again.', 'error');
    }
  }

  async resetData() {
    const confirmed = window.confirm('Reset all posts and settings to zero? This writes an empty state to assets/js/data.js.');
    if (!confirmed) return;

    try {
      await DB.resetAll();
      await this.loadPostsList();
      await this.loadSettings();
      this.showToast('All data reset to zero successfully!', 'success');
    } catch (err) {
      console.error('Reset data error:', err);
      this.showToast('Error resetting data. Please try again.', 'error');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast--${type} show`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
  }

  // ===== EXPORT FUNCTIONS =====

  async exportAsJSON() {
    try {
      const posts = await DB.getPosts();
      const settings = await DB.getSettings();
      
      const data = {
        posts,
        settings,
        exportedAt: new Date().toISOString()
      };
      
      const json = JSON.stringify(data, null, 2);
      this.downloadFile(json, 'data-backup.json', 'application/json');
      this.showToast('Data exported as JSON successfully!', 'success');
    } catch (err) {
      console.error('Export JSON error:', err);
      this.showToast('Error exporting data. Check console for details.', 'error');
    }
  }

  async exportAsCode() {
    try {
      const posts = await DB.getPosts();
      const settings = await DB.getSettings();
      
      const code = `// ===== EMBEDDED DATA STORAGE =====
// Generated: ${new Date().toISOString()}
// Copy this into assets/js/data.js

const EMBEDDED_DATA = {
  // Admin PIN - Change to your preferred PIN
  adminPin: '${DB.adminPin}',

  // All posts stored inline
  posts: ${JSON.stringify(posts, null, 4)},

  // Global settings
  settings: ${JSON.stringify(settings, null, 4)},

  // Helper functions
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

  updatePost(id, updates) {
    const post = this.posts.find(p => p.id === id);
    if (post) {
      Object.assign(post, updates, { updatedAt: new Date().toISOString() });
      return post;
    }
    return null;
  },

  deletePost(id) {
    const index = this.posts.findIndex(p => p.id === id);
    if (index > -1) {
      this.posts.splice(index, 1);
      return true;
    }
    return false;
  },

  getPostById(id) {
    return this.posts.find(p => p.id === id);
  },

  getAllPosts() {
    return this.posts;
  },

  exportAsJSON() {
    return JSON.stringify({
      posts: this.posts,
      settings: this.settings,
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  verifyPin(pin) {
    return pin === this.adminPin;
  },

  updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings,
      lastModified: new Date().toISOString()
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EMBEDDED_DATA;
}`;

      this.downloadFile(code, 'data.js', 'text/javascript');
      this.showToast('Data exported as code successfully! Update your assets/js/data.js file.', 'success');
    } catch (err) {
      console.error('Export code error:', err);
      this.showToast('Error exporting code. Check console for details.', 'error');
    }
  }

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => { new AdminPanel(); });
