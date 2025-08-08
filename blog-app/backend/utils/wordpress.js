const axios = require('axios');
const FormData = require('form-data');

class WordPressAPI {
  constructor(siteUrl, username, applicationPassword) {
    this.siteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
    this.username = username;
    this.applicationPassword = applicationPassword;
    this.baseURL = `${this.siteUrl}/wp-json/wp/v2`;
    
    // Create axios instance with authentication
    this.api = axios.create({
      baseURL: this.baseURL,
      auth: {
        username: this.username,
        password: this.applicationPassword,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Test connection to WordPress site
  async testConnection() {
    try {
      const response = await axios.get(`${this.siteUrl}/wp-json/wp/v2/users/me`, {
        auth: {
          username: this.username,
          password: this.applicationPassword,
        },
      });
      return { success: true, user: response.data };
    } catch (error) {
      console.error('WordPress connection test failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to connect to WordPress site' 
      };
    }
  }

  // Get all posts
  async getPosts(page = 1, perPage = 10) {
    try {
      const response = await this.api.get('/posts', {
        params: {
          page,
          per_page: perPage,
          _embed: true, // Include featured images and other embedded data
        },
      });
      
      return {
        success: true,
        posts: response.data,
        totalPages: parseInt(response.headers['x-wp-totalpages'] || 1),
        total: parseInt(response.headers['x-wp-total'] || 0),
      };
    } catch (error) {
      console.error('Failed to get posts:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch posts',
      };
    }
  }

  // Create a new post
  async createPost(postData) {
    try {
      const response = await this.api.post('/posts', {
        title: postData.title,
        content: postData.content,
        status: postData.status || 'publish',
        featured_media: postData.featuredMediaId || null,
        excerpt: postData.excerpt || '',
      });

      return {
        success: true,
        post: response.data,
      };
    } catch (error) {
      console.error('Failed to create post:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create post',
      };
    }
  }

  // Update a post
  async updatePost(postId, postData) {
    try {
      const response = await this.api.put(`/posts/${postId}`, {
        title: postData.title,
        content: postData.content,
        status: postData.status || 'publish',
        featured_media: postData.featuredMediaId || null,
        excerpt: postData.excerpt || '',
      });

      return {
        success: true,
        post: response.data,
      };
    } catch (error) {
      console.error('Failed to update post:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update post',
      };
    }
  }

  // Delete a post
  async deletePost(postId) {
    try {
      const response = await this.api.delete(`/posts/${postId}`);
      return {
        success: true,
        post: response.data,
      };
    } catch (error) {
      console.error('Failed to delete post:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete post',
      };
    }
  }

  // Upload media (image)
  async uploadMedia(fileBuffer, filename, mimeType) {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename,
        contentType: mimeType,
      });

      const response = await axios.post(`${this.baseURL}/media`, formData, {
        auth: {
          username: this.username,
          password: this.applicationPassword,
        },
        headers: {
          ...formData.getHeaders(),
        },
      });

      return {
        success: true,
        media: response.data,
      };
    } catch (error) {
      console.error('Failed to upload media:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload media',
      };
    }
  }
}

module.exports = WordPressAPI;