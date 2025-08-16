/**
 * WordPress Provider Adapter
 * 
 * Supports both self-hosted WordPress and WordPress.com
 * Implements the CMSAdapter interface
 */

const axios = require('axios');

class WordPressAdapter {
  constructor() {
    this.id = 'wordpress';
    this.name = 'WordPress';
    this.category = 'cms';
    
    // Define supported features
    this.supports = {
      images: true,
      tags: true,
      scheduling: true,
      edit: true,
      delete: true,
      categories: true,
      excerpts: true,
      featuredImages: true,
      customFields: true
    };
  }

  /**
   * Verify connection to WordPress
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { siteUrl, username, password, appPassword } = auth;
      
      if (!siteUrl || !username || (!password && !appPassword)) {
        return {
          ok: false,
          details: 'Missing required credentials: siteUrl, username, and password/appPassword'
        };
      }

      // Test connection by fetching user info
      const response = await axios.get(`${siteUrl}/wp-json/wp/v2/users/me`, {
        auth: {
          username: username,
          password: appPassword || password
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data) {
        return {
          ok: true,
          details: {
            userId: response.data.id,
            userName: response.data.name,
            userEmail: response.data.email,
            capabilities: response.data.capabilities
          }
        };
      }

      return {
        ok: false,
        details: 'Failed to authenticate with WordPress'
      };
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          return {
            ok: false,
            details: 'Invalid credentials or insufficient permissions'
          };
        } else if (error.response.status === 404) {
          return {
            ok: false,
            details: 'WordPress REST API not found. Please ensure the REST API is enabled.'
          };
        }
      }
      
      return {
        ok: false,
        details: error.message || 'Connection verification failed'
      };
    }
  }

  /**
   * List posts from WordPress
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { siteUrl, username, password, appPassword } = auth;
      const { page = 1, limit = 20 } = opts;
      
      const response = await axios.get(`${siteUrl}/wp-json/wp/v2/posts`, {
        auth: {
          username: username,
          password: appPassword || password
        },
        params: {
          page,
          per_page: limit,
          status: 'publish',
          _embed: true
        },
        timeout: 15000
      });

      return response.data.map(post => ({
        id: post.id,
        title: post.title.rendered,
        content: post.content.rendered,
        excerpt: post.excerpt.rendered,
        status: post.status,
        date: post.date,
        modified: post.modified,
        slug: post.slug,
        link: post.link,
        featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
        categories: post._embedded?.['wp:term']?.[0]?.map(cat => cat.name) || [],
        tags: post._embedded?.['wp:term']?.[1]?.map(tag => tag.name) || [],
        author: post._embedded?.author?.[0]?.name,
        metadata: {
          wordpressId: post.id,
          slug: post.slug,
          link: post.link
        }
      }));
    } catch (error) {
      console.error('Failed to list WordPress posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on WordPress
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { siteUrl, username, password, appPassword } = auth;
      
      // Prepare post data for WordPress
      const postData = {
        title: input.title,
        content: input.content,
        status: input.status || 'draft',
        excerpt: input.excerpt || '',
        categories: input.categories || [],
        tags: input.tags || []
      };

      // Add featured image if provided
      if (input.featuredImage) {
        postData.featured_media = await this._uploadImage(auth, input.featuredImage);
      }

      // Add scheduling if provided
      if (input.scheduledAt) {
        postData.date = input.scheduledAt.toISOString();
      }

      const response = await axios.post(`${siteUrl}/wp-json/wp/v2/posts`, postData, {
        auth: {
          username: username,
          password: appPassword || password
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 201) {
        return {
          success: true,
          postId: response.data.id.toString(),
          externalId: response.data.id.toString(),
          url: response.data.link,
          message: 'Post created successfully on WordPress',
          metadata: {
            wordpressId: response.data.id,
            slug: response.data.slug,
            link: response.data.link,
            status: response.data.status
          }
        };
      }

      return {
        success: false,
        error: 'Failed to create post on WordPress',
        message: 'Unexpected response from WordPress API'
      };
    } catch (error) {
      console.error('Failed to create WordPress post:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unknown WordPress error';
        return {
          success: false,
          error: errorMessage,
          message: `WordPress API error: ${errorMessage}`
        };
      }

      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on WordPress
   * @param {object} auth - Authentication credentials
   * @param {string} postId - WordPress post ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { siteUrl, username, password, appPassword } = auth;
      
      // Prepare update data
      const updateData = {};
      
      if (input.title) updateData.title = input.title;
      if (input.content) updateData.content = input.content;
      if (input.excerpt !== undefined) updateData.excerpt = input.excerpt;
      if (input.status) updateData.status = input.status;
      if (input.categories) updateData.categories = input.categories;
      if (input.tags) updateData.tags = input.tags;

      // Update featured image if provided
      if (input.featuredImage) {
        updateData.featured_media = await this._uploadImage(auth, input.featuredImage);
      }

      const response = await axios.put(`${siteUrl}/wp-json/wp/v2/posts/${postId}`, updateData, {
        auth: {
          username: username,
          password: appPassword || password
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 200) {
        return {
          success: true,
          postId: response.data.id.toString(),
          externalId: response.data.id.toString(),
          url: response.data.link,
          message: 'Post updated successfully on WordPress',
          metadata: {
            wordpressId: response.data.id,
            slug: response.data.slug,
            link: response.data.link,
            status: response.data.status,
            modified: response.data.modified
          }
        };
      }

      return {
        success: false,
        error: 'Failed to update post on WordPress',
        message: 'Unexpected response from WordPress API'
      };
    } catch (error) {
      console.error('Failed to update WordPress post:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unknown WordPress error';
        return {
          success: false,
          error: errorMessage,
          message: `WordPress API error: ${errorMessage}`
        };
      }

      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from WordPress
   * @param {object} auth - Authentication credentials
   * @param {string} postId - WordPress post ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { siteUrl, username, password, appPassword } = auth;
      
      const response = await axios.delete(`${siteUrl}/wp-json/wp/v2/posts/${postId}`, {
        auth: {
          username: username,
          password: appPassword || password
        },
        timeout: 15000
      });

      if (response.status === 200) {
        return {
          ok: true,
          message: 'Post deleted successfully from WordPress'
        };
      }

      return {
        ok: false,
        message: 'Failed to delete post from WordPress'
      };
    } catch (error) {
      console.error('Failed to delete WordPress post:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unknown WordPress error';
        return {
          ok: false,
          message: `WordPress API error: ${errorMessage}`
        };
      }

      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to WordPress
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { siteUrl, username, password, appPassword } = auth;
      
      // Create form data for file upload
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fileBuffer, {
        filename: filename,
        contentType: this._getMimeType(filename)
      });

      const response = await axios.post(`${siteUrl}/wp-json/wp/v2/media`, form, {
        auth: {
          username: username,
          password: appPassword || password
        },
        headers: {
          ...form.getHeaders()
        },
        timeout: 60000
      });

      if (response.status === 201) {
        return {
          url: response.data.source_url,
          id: response.data.id.toString()
        };
      }

      throw new Error('Failed to upload image to WordPress');
    } catch (error) {
      console.error('Failed to upload image to WordPress:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Helper method to get MIME type from filename
   * @param {string} filename - The filename
   * @returns {string} MIME type
   */
  _getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Helper method to upload image from URL or base64
   * @param {object} auth - Authentication credentials
   * @param {string} imageData - Image URL or base64 data
   * @returns {Promise<number>} WordPress media ID
   */
  async _uploadImage(auth, imageData) {
    if (imageData.startsWith('http')) {
      // Download image from URL
      const response = await axios.get(imageData, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      const filename = imageData.split('/').pop() || 'image.jpg';
      
      const uploadResult = await this.uploadImage(auth, buffer, filename);
      return parseInt(uploadResult.id);
    } else if (imageData.startsWith('data:')) {
      // Handle base64 image data
      const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = mimeType.split('/')[1] || 'jpg';
        const filename = `image.${ext}`;
        
        const uploadResult = await this.uploadImage(auth, buffer, filename);
        return parseInt(uploadResult.id);
      }
    }
    
    throw new Error('Invalid image data format');
  }
}

module.exports = new WordPressAdapter();