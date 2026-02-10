// ===== POST VIEW PAGE FUNCTIONALITY =====

class PostView {
  constructor() {
    this.postId = this.getPostIdFromURL();
    this.init();
  }

  init() {
    if (this.postId) {
      this.loadPost();
    } else {
      this.showError();
    }
  }

  getPostIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  loadPost() {
    const post = DB.getPostById(this.postId);

    if (!post) {
      this.showError();
      return;
    }

    this.displayPost(post);
    this.loadRelatedPosts(post);
  }

  displayPost(post) {
    // Set thumbnail
    const thumbnail = document.getElementById('postThumbnail');
    if (post.thumbnail) {
      thumbnail.src = post.thumbnail;
      thumbnail.style.display = 'block';
    }

    // Set title
    document.getElementById('postTitle').textContent = post.title || 'Untitled Post';

    // Set category and date
    document.getElementById('postCategory').textContent = post.category || 'Uncategorized';
    document.getElementById('postDate').textContent = this.formatDate(post.createdAt);

    // Set description (with line breaks)
    const descElement = document.getElementById('postDescription');
    if (post.description) {
      descElement.innerHTML = post.description.split('\n').map(line => 
        `<p>${line.trim()}</p>`
      ).join('');
    } else {
      descElement.innerHTML = '<p>No description available</p>';
    }

    // Set YouTube video (support stored ID, full embed URL, or raw iframe HTML)
    if (post.youtubeEmbed) {
      const youtubeContainer = document.getElementById('youtubeContainer');
      // If it's raw iframe HTML, extract the src and set it on the existing iframe
      if (/^\s*<iframe/i.test(post.youtubeEmbed)) {
        const srcMatch = String(post.youtubeEmbed).match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
          const youtubeEmbed = document.getElementById('youtubeEmbed');
          youtubeEmbed.src = srcMatch[1];
          youtubeContainer.style.display = 'block';
        } else {
          // Fallback: insert the iframe HTML but keep container visible
          youtubeContainer.innerHTML = post.youtubeEmbed;
          youtubeContainer.style.display = 'block';
        }
      } else if (/^https?:\/\//i.test(post.youtubeEmbed)) {
        // If it's a full URL (possibly an embed URL), use it directly as src
        const youtubeEmbed = document.getElementById('youtubeEmbed');
        youtubeEmbed.src = post.youtubeEmbed;
        youtubeContainer.style.display = 'block';
      } else {
        // Otherwise assume it's an ID
        const youtubeEmbed = document.getElementById('youtubeEmbed');
        youtubeEmbed.src = `https://www.youtube.com/embed/${post.youtubeEmbed}`;
        youtubeContainer.style.display = 'block';
      }
    }

    // Update page title and meta
    document.title = `${post.title} - Matin`;
  }

  async loadRelatedPosts(currentPost) {
    try {
      const allPosts = await DB.getPosts();
      const relatedPosts = allPosts
        .filter(post => 
          (post._id || post.id) !== (currentPost._id || currentPost.id) && 
          post.category === currentPost.category
        )
        .slice(0, 3);

      const container = document.getElementById('relatedPostsContainer');

      if (relatedPosts.length === 0) {
        document.querySelector('.post-view__related').style.display = 'none';
        return;
    }

    container.innerHTML = relatedPosts.map(post => this.createRelatedPostCard(post)).join('');
    } catch (error) {
      console.error('Error loading related posts:', error);
    }
  }
  createRelatedPostCard(post) {
    return `
      <a href="post-view.html?id=${post._id || post.id}" class="post-view__related-card">
        <div class="post-view__related-image" ${post.thumbnail ? `style="background-image: url('${post.thumbnail}')"` : ''}></div>
        <div class="post-view__related-content">
          <h3>${post.title}</h3>
          <p>${post.description.substring(0, 100)}...</p>
        </div>
      </a>
    `;
  }

  formatDate(dateString) {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown Date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  showError() {
    const section = document.querySelector('.post-view');
    section.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h2 style="color: var(--first-color); margin-bottom: 1rem;">Post Not Found</h2>
        <p style="color: #999999; margin-bottom: 1.5rem;">The post you're looking for doesn't exist.</p>
        <a href="post.html" class="button">Back to Posts</a>
      </div>
    `;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  new PostView();
});
