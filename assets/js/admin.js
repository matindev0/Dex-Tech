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
    // Check if user is already authenticated in this session
    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
      this.authenticate();
    }
  }

  setupPinAuthentication() {
    this.pinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pin = this.pinInput.value;

      if (DB.verifyPin(pin)) {
        sessionStorage.setItem('adminAuthenticated', 'true');
        this.authenticate();
      } else {
        this.pinError.textContent = 'Invalid PIN. Please try again.';
        this.pinError.style.display = 'block';
        this.pinInput.value = '';
        this.pinInput.focus();
      }
    });

    // Clear error message when user starts typing
    this.pinInput.addEventListener('input', () => {
      this.pinError.style.display = 'none';
    });

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      this.logout();
    });
  }

  async authenticate() {
    this.isAuthenticated = true;
    this.pinModal.style.display = 'none';
    this.adminContainer.style.display = 'block';
    await this.loadPostsList();
    await this.loadSettings();
  }

  logout() {
    sessionStorage.removeItem('adminAuthenticated');
    this.isAuthenticated = false;
    this.adminContainer.style.display = 'none';
    this.pinModal.style.display = 'flex';
    this.pinForm.reset();
    this.pinError.style.display = 'none';
  }

  setupTabNavigation() {
    const navItems = document.querySelectorAll('.admin__nav-item');
    const tabs = document.querySelectorAll('.admin__tab');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tabName = item.getAttribute('data-tab');

        // Remove active class from all nav items and tabs
        navItems.forEach(i => i.classList.remove('active'));
        tabs.forEach(t => t.classList.remove('active'));

        // Add active class to clicked nav item and corresponding tab
        item.classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');

        if (tabName === 'settings') {
          this.loadSettings();
        }
      });
    });
  }

  setupPostManagement() {
    // Add new post button
    document.getElementById('addPostBtn').addEventListener('click', () => {
      this.currentEditId = null;
      this.openPostForm();
    });

    // Post form submission
    document.getElementById('postForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePost();
    });

    // Modal controls
    document.getElementById('closeModal').addEventListener('click', () => this.closePostForm());
    document.getElementById('cancelBtn').addEventListener('click', () => this.closePostForm());
    document.getElementById('modalOverlay').addEventListener('click', () => this.closePostForm());

    // File upload handling
    this.setupFileUpload();

    // Delete confirmation
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('deleteOverlay').addEventListener('click', () => this.closeDeleteModal());
  }

  setupFileUpload() {
    const fileInput = document.getElementById('postThumbnail');
    const fileLabel = document.querySelector('.file-upload__label');
    const preview = document.getElementById('thumbnailPreview');
    const previewImg = document.getElementById('thumbnailPreviewImg');
    const removeBtn = document.getElementById('removeThumbnail');

    // File input change
    fileInput.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files[0], preview, previewImg);
    });

    // Drag and drop
    fileLabel.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileLabel.style.borderColor = 'var(--first-color)';
      fileLabel.style.backgroundColor = 'rgba(65, 88, 208, 0.15)';
    });

    fileLabel.addEventListener('dragleave', () => {
      fileLabel.style.borderColor = '';
      fileLabel.style.backgroundColor = '';
    });

    fileLabel.addEventListener('drop', (e) => {
      e.preventDefault();
      fileLabel.style.borderColor = '';
      fileLabel.style.backgroundColor = '';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        this.handleFileSelect(files[0], preview, previewImg);
      }
    });

    // Remove button
    removeBtn.addEventListener('click', () => {
      fileInput.value = '';
      preview.style.display = 'none';
      previewImg.src = '';
    });
  }

  handleFileSelect(file, preview, previewImg) {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      this.showToast('Please select a valid image file', 'error');
    }
  }

  setupSettings() {
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      this.saveSettings();
    });
  }

  async openPostForm(postId = null) {
    const modal = document.getElementById('postFormModal');
    const form = document.getElementById('postForm');
    const title = document.getElementById('formTitle');
    const fileInput = document.getElementById('postThumbnail');
    const preview = document.getElementById('thumbnailPreview');

    form.reset();
    fileInput.value = '';
    preview.style.display = 'none';

    if (postId) {
      this.currentEditId = postId;
      const post = await DB.getPostById(postId);
      if (post) {
        title.textContent = 'Edit Post';
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postDescription').value = post.description;
        document.getElementById('postCategory').value = post.category;
        // If stored value is a full URL or iframe, show it as-is; otherwise build a watch URL
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
        
        // Show existing thumbnail
        if (post.thumbnail) {
          document.getElementById('thumbnailPreviewImg').src = post.thumbnail;
          preview.style.display = 'block';
        }
      }
    } else {
      this.currentEditId = null;
      title.textContent = 'Add New Post';
    }

    modal.style.display = 'flex';
  }

  closePostForm() {
    document.getElementById('postFormModal').style.display = 'none';
    document.getElementById('postForm').reset();
    this.currentEditId = null;
  }

  async savePost() {
    const titleInput = document.getElementById('postTitle').value.trim();
    const descriptionInput = document.getElementById('postDescription').value.trim();
    const categoryInput = document.getElementById('postCategory').value.trim();
    const youtubeInput = document.getElementById('postYoutube').value.trim();
    const thumbnailFile = document.getElementById('postThumbnail');

    // Validate required fields
    if (!titleInput || !descriptionInput || !categoryInput) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }

    // For new posts, thumbnail is required
    if (!this.currentEditId && !thumbnailFile.files.length) {
      this.showToast('Please upload a thumbnail image', 'error');
      return;
    }

    // Extract YouTube video ID from URL if provided
    let videoId = '';
    if (youtubeInput) {
      videoId = DB.extractVideoId(youtubeInput);
      if (!videoId) {
        this.showToast('Invalid YouTube URL. Please enter a valid YouTube link.', 'error');
        return;
      }
    }

    // Handle thumbnail upload
    if (thumbnailFile.files.length > 0) {
      try {
        const file = thumbnailFile.files[0];
        const base64 = await DB.fileToBase64(file);
        await this.completeSavePost(titleInput, descriptionInput, categoryInput, videoId, base64);
      } catch (error) {
        this.showToast('Error uploading thumbnail. Please try again.', 'error');
      }
    } else if (this.currentEditId) {
      // Editing without changing thumbnail - use existing thumbnail
      const existingPost = await DB.getPostById(this.currentEditId);
      await this.completeSavePost(titleInput, descriptionInput, categoryInput, videoId, existingPost.thumbnail);
    }
  }
async completeSavePost(title, description, category, videoId, thumbnail) {
    const post = {
      title: title,
      description: description,
      category: category,
      youtubeEmbed: videoId,
      thumbnail: thumbnail
    };

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
    } catch (error) {
      this.showToast('Error saving post to database. Please try again.', 'error');
  async loadPostsList() {
    const posts = await DB.getPosts();
    const container = document.getElementById('postsListContainer');

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="admin__empty">
          <i class='bx bx-inbox'></i>
          <p>No posts yet. Create your first post!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = posts.map(post => this.createPostListItem(post)).join('');

    // Add event listeners to action buttons
    document.querySelectorAll('.admin__post-edit').forEach(btn => {
      btn.addEventListener('click', async () => {
        awaittainer.innerHTML = posts.map(post => this.createPostListItem(post)).join('');

    // Add event listeners to action buttons
    document.querySelectorAll('.admin__post-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openPostForm(btn.getAttribute('data-id'));
      });
    });

    document.querySelectorAll('.admin__post-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentEditId = btn.getAttribute('data-id');
        this.openDeleteModal();
      });
    });
  }

  createPostListItem(post) {
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return `
      <div class="admin__post-item">
        <div class="admin__post-info">
          <h3 class="admin__post-title">${post.title}</h3>
          <p class="admin__post-category">
            <span class="admin__post-category-badge">${post.category}</span>
          </p>
          <p class="admin__post-description">${post.description.substring(0, 100)}...</p>
          <small class="admin__post-date">Created: ${formatDate(post.createdAt)}</small>
        </div>
        <div class="admin__post-actions">
          <button class="admin__post-edit" data-id="${post._id || post.id}" title="Edit">
            <i class='bx bx-edit'></i>
          </button>
          <button class="admin__post-delete" data-id="${post._id || post.id}" title="Delete">
            <i class='bx bx-trash'></i>
          </button>
        </div>
      </div>
    `;
  }

  openDeleteModal() {
    document.getElementById('deleteConfirmModal').style.display = 'flex';
    document.getElementById('confirmDeleteBtn').onclick = () => {
      this.deletePost();
    };
  }
async deletePost() {
    if (this.currentEditId) {
      try {
        await DB.deletePost(this.currentEditId);
        this.showToast('Post deleted successfully!', 'success');
        this.closeDeleteModal();
        await this.loadPostsList();
        this.currentEditId = null;
      } catch (error) {
        this.showToast('Error deleting post. Please try again.', 'error');
  async loadSettings() {
    try {
      const settings = await DB.getSettings();
      document.getElementById('adsenseCode').value = settings?.adsenseCode || '';
      document.getElementById('analyticsCode').value = settings?.analyticsCode || '';
    } catch (error) {
      console.error('Error loading settings:', error);
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
    } catch (error) {
      this.showToast('Error saving settings. Please try again.', 'error');
      console.error('Save settings error:', error);
    }analyticsCode || '';
  }

  saveSettings() {
    const settings = {
      adsenseCode: document.getElementById('adsenseCode').value,
      analyticsCode: document.getElementById('analyticsCode').value
    };

    DB.updateSettings(settings);
    this.showToast('Settings saved successfully!', 'success');
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast--${type} show`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  new AdminPanel();
});
