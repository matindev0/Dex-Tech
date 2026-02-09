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
    this.loadPosts();
    this.setupEventListeners();
    this.loadAdSense();
  }

  loadPosts() {
    this.currentPosts = DB.getPosts();
    this.render();
  }

  setupEventListeners() {
    this.searchInput.addEventListener('input', () => this.handleSearch());
    this.categoryFilter.addEventListener('input', () => {
      this.handleFilter();
      this.updateClearButton();
    });
    this.clearFilterBtn.addEventListener('click', () => this.clearFilter());
  }

  handleSearch() {
    this.filterPosts();
  }

  handleFilter() {
    this.filterPosts();
  }

  filterPosts() {
    const searchQuery = this.searchInput.value.toLowerCase();
    const categoryQuery = this.categoryFilter.value.toLowerCase();

    let filtered = DB.getPosts();

    if (searchQuery) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchQuery) ||
        post.description.toLowerCase().includes(searchQuery) ||
        post.category.toLowerCase().includes(searchQuery)
      );
    }

    if (categoryQuery) {
      filtered = filtered.filter(post =>
        post.category.toLowerCase().includes(categoryQuery)
      );
    }

    this.currentPosts = filtered;
    this.render();
  }

  clearFilter() {
    this.searchInput.value = '';
    this.categoryFilter.value = '';
    this.currentPosts = DB.getPosts();
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
      return text.length > length ? text.substring(0, length) + '...' : text;
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const thumbnail = post.thumbnail ? 
      `style="background-image: url('${post.thumbnail}'); background-size: cover; background-position: center;"` : '';

    return `
      <article class="posts__card" onclick="window.location.href='post-view.html?id=${post.id}'">
        <div class="posts__card-image" ${thumbnail}>
          <span class="posts__card-category">${post.category}</span>
        </div>
        <div class="posts__card-content">
          <h3 class="posts__card-title">${post.title}</h3>
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

  loadAdSense() {
    const settings = DB.getSettings();
    if (settings.adsenseCode) {
      const script = document.getElementById('adsenseScript');
      script.textContent = settings.adsenseCode;
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
