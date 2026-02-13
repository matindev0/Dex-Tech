// ===== POSTS PAGE FUNCTIONALITY =====

class PostsPage {
  constructor() {
    this.postsContainer = document.getElementById('postsContainer');
    this.noPosts = document.getElementById('noPosts');
    this.searchInput = document.getElementById('searchInput');
    this.categoryFilter = document.getElementById('categoryFilter');
    this.clearFilterBtn = document.getElementById('clearFilterBtn');
    this.currentPosts = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadAdSense();
    // Wait for DB to be ready
    this.waitForDB().then(() => {
      this.loadPosts();
    });
  }

  async waitForDB() {
    // Wait for DB initialization
    return new Promise((resolve) => {
      // DB.init() should have already run, give it a moment
      setTimeout(() => resolve(), 100);
    });
  }

  async loadPosts() {
    try {
      this.currentPosts = await DB.getPosts();
      this.render();
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }

  setupEventListeners() {
    this.searchInput.addEventListener('input', () => this.handleSearch());
    this.categoryFilter.addEventListener('input', () => {
      this.handleFilter();
      this.updateClearButton();
    });
    this.clearFilterBtn.addEventListener('click', () => this.clearFilter());
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshPostsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshPosts());
    }
  }

  async refreshPosts() {
    const refreshBtn = document.getElementById('refreshPostsBtn');
    if (refreshBtn) {
      refreshBtn.classList.add('spinning');
    }
    await this.loadPosts();
    setTimeout(() => {
      if (refreshBtn) {
        refreshBtn.classList.remove('spinning');
      }
    }, 500);
  }

  async handleSearch() {
    await this.filterPosts();
  }

  async handleFilter() {
    await this.filterPosts();
  }

  async filterPosts() {
    const searchQuery = this.searchInput.value.toLowerCase();
    const categoryQuery = this.categoryFilter.value.toLowerCase();

    let filtered = await DB.getPosts();

    if (searchQuery) {
      filtered = filtered.filter(post =>
        (post.title && post.title.toLowerCase().includes(searchQuery)) ||
        (post.description && post.description.toLowerCase().includes(searchQuery)) ||
        (post.category && post.category.toLowerCase().includes(searchQuery))
      );
    }

    if (categoryQuery) {
      filtered = filtered.filter(post =>
        post.category && post.category.toLowerCase().includes(categoryQuery)
      );
    }

    this.currentPosts = filtered;
    this.render();
  }

  async clearFilter() {
    this.searchInput.value = '';
    this.categoryFilter.value = '';
    this.currentPosts = await DB.getPosts();
    this.render();
    this.updateClearButton();
  }

  updateClearButton() {
    const hasFilter = this.searchInput.value || this.categoryFilter.value;
    this.clearFilterBtn.style.display = hasFilter ? 'flex' : 'none';
  }

  render() {
    if (this.currentPosts.length === 0) {
      this.postsContainer.style.display = 'none';
      this.noPosts.style.display = 'flex';
      return;
    }

    this.postsContainer.style.display = 'grid';
    this.noPosts.style.display = 'none';
    this.postsContainer.innerHTML = this.currentPosts.map(post => this.createPostCard(post)).join('');
  }

  createPostCard(post) {
    const truncateDescription = (text, length = 150) => {
      return text && text.length > length ? text.substring(0, length) + '...' : (text || '');
    };

    const formatDate = (date) => {
      if (!date) return 'Unknown Date';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Unknown Date';
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const thumbnail = post.thumbnail ? 
      `style="background-image: url('${post.thumbnail}'); background-size: cover; background-position: center;"` : '';

    return `
      <article class="posts__card" onclick="window.location.href='post-view.html?id=${post._id || post.id}'">
        <div class="posts__card-image" ${thumbnail}>
          <span class="posts__card-category">${post.category || 'Uncategorized'}</span>
        </div>
        <div class="posts__card-content">
          <h3 class="posts__card-title">${post.title || 'Untitled'}</h3>
          <p class="posts__card-description">${truncateDescription(post.description)}</p>
          <div class="posts__card-meta">
            <small class="posts__card-date">
              <i class='bx bx-calendar'></i>
              ${formatDate(post.createdAt)}
            </small>
          </div>
        </div>
      </article>
    `;
  }

  async loadAdSense() {
    try {
      const settings = await DB.getSettings();
      if (settings && settings.adsenseCode) {
        const script = document.getElementById('adsenseScript');
        if (script) {
          script.textContent = settings.adsenseCode;
        }
      }
    } catch (error) {
      console.error('Error loading AdSense:', error);
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  new PostsPage();

  // Scroll reveal animations
  if (typeof ScrollReveal !== 'undefined') {
    const sr = ScrollReveal({
      origin: 'bottom',
      distance: '60px',
      duration: 2000,
      delay: 200
    });

    sr.reveal('.posts__card', {
      interval: 100
    });
  }
});
