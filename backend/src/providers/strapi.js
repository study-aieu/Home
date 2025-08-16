/**
 * Strapi Provider Adapter
 * 
 * Supports publishing to Strapi headless CMS
 * Implements the CMSAdapter interface
 */

class StrapiAdapter {
  constructor() {
    this.id = 'strapi';
    this.name = 'Strapi';
    this.category = 'headless-cms';
    
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
   * Verify connection to Strapi
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { baseUrl, apiToken } = auth;
      
      if (!baseUrl || !apiToken) {
        return {
          ok: false,
          details: 'Missing required credentials: baseUrl and apiToken'
        };
      }

      // Normalize base URL
      const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Test Strapi API access by fetching admin user info
      const response = await fetch(`${normalizedUrl}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const user = await response.json();
        return {
          ok: true,
          details: {
            baseUrl: normalizedUrl,
            username: user.username,
            email: user.email,
            role: user.role?.name || 'Unknown',
            blocked: user.blocked || false
          }
        };
      } else if (response.status === 401) {
        return {
          ok: false,
          details: 'Invalid API token'
        };
      } else if (response.status === 403) {
        return {
          ok: false,
          details: 'Access denied - insufficient permissions'
        };
      } else {
        return {
          ok: false,
          details: `Strapi API error: ${response.status}`
        };
      }
    } catch (error) {
      return {
        ok: false,
        details: error.message || 'Connection verification failed'
      };
    }
  }

  /**
   * List posts from Strapi
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { baseUrl, apiToken, contentType = 'api::article.article' } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // Normalize base URL
      const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Calculate pagination
      const start = (page - 1) * limit;

      // Fetch articles from Strapi
      const response = await fetch(
        `${normalizedUrl}/api/articles?pagination[start]=${start}&pagination[limit]=${limit}&populate=*&sort=createdAt:desc`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Strapi articles to our format
      const posts = data.data.map(article => {
        const attributes = article.attributes;
        
        return {
          id: article.id.toString(),
          title: attributes.title || '',
          content: attributes.content || '',
          excerpt: attributes.excerpt || '',
          status: attributes.publishedAt ? 'published' : 'draft',
          date: attributes.publishedAt || attributes.createdAt,
          modified: attributes.updatedAt,
          slug: attributes.slug || '',
          link: attributes.slug ? `${normalizedUrl}/blog/${attributes.slug}` : '',
          featuredImage: attributes.featuredImage?.data ? {
            url: `${normalizedUrl}${attributes.featuredImage.data.attributes.url}`,
            alt: attributes.featuredImage.data.attributes.alternativeText || ''
          } : null,
          categories: attributes.categories?.data ? 
            attributes.categories.data.map(cat => cat.attributes.name) : [],
          tags: attributes.tags?.data ? 
            attributes.tags.data.map(tag => tag.attributes.name) : [],
          author: attributes.author?.data ? 
            attributes.author.data.attributes.name : '',
          scheduledAt: attributes.publishedAt ? new Date(attributes.publishedAt) : null,
          metadata: {
            strapiId: article.id,
            contentType: article.type,
            locale: attributes.locale,
            slug: attributes.slug
          }
        };
      });

      return posts;
    } catch (error) {
      console.error('Failed to list Strapi posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Strapi
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { baseUrl, apiToken, contentType = 'api::article.article' } = auth;
      
      // Normalize base URL
      const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Prepare the article data
      const articleData = {
        data: {
          title: input.title,
          content: input.content,
          excerpt: input.excerpt || '',
          slug: this._generateSlug(input.title),
          publishedAt: input.scheduledAt ? input.scheduledAt.toISOString() : new Date().toISOString()
        }
      };

      // Add tags if provided
      if (input.tags && input.tags.length > 0) {
        articleData.data.tags = input.tags.map(tag => ({ name: tag }));
      }

      // Add categories if provided
      if (input.categories && input.categories.length > 0) {
        articleData.data.categories = input.categories.map(category => ({ name: category }));
      }

      // Add author if provided
      if (input.author) {
        articleData.data.author = { name: input.author };
      }

      // Add featured image if provided
      if (input.featuredImage) {
        articleData.data.featuredImage = input.featuredImage;
      }

      // Create the article
      const response = await fetch(
        `${normalizedUrl}/api/articles`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(articleData)
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        const article = result.data;
        
        return {
          success: true,
          postId: article.id.toString(),
          externalId: article.id.toString(),
          url: `${normalizedUrl}/blog/${article.attributes.slug}`,
          message: 'Post created successfully on Strapi',
          metadata: {
            strapiId: article.id,
            contentType: article.type,
            slug: article.attributes.slug
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to create post',
          message: `Strapi API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to create Strapi post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Strapi
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Strapi article ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { baseUrl, apiToken } = auth;
      
      // Normalize base URL
      const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Prepare updated data
      const updateData = {
        data: {}
      };

      if (input.title) {
        updateData.data.title = input.title;
      }
      
      if (input.content) {
        updateData.data.content = input.content;
      }
      
      if (input.excerpt !== undefined) {
        updateData.data.excerpt = input.excerpt;
      }
      
      if (input.tags) {
        updateData.data.tags = input.tags.map(tag => ({ name: tag }));
      }
      
      if (input.categories) {
        updateData.data.categories = input.categories.map(category => ({ name: category }));
      }
      
      if (input.author) {
        updateData.data.author = { name: input.author };
      }
      
      if (input.featuredImage) {
        updateData.data.featuredImage = input.featuredImage;
      }
      
      if (input.scheduledAt) {
        updateData.data.publishedAt = input.scheduledAt.toISOString();
      }

      // Update the article
      const response = await fetch(
        `${normalizedUrl}/api/articles/${postId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        const article = result.data;
        
        return {
          success: true,
          postId: article.id.toString(),
          externalId: article.id.toString(),
          url: `${normalizedUrl}/blog/${article.attributes.slug}`,
          message: 'Post updated successfully on Strapi',
          metadata: {
            strapiId: article.id,
            contentType: article.type,
            slug: article.attributes.slug
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to update post',
          message: `Strapi API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to update Strapi post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Strapi
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Strapi article ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { baseUrl, apiToken } = auth;
      
      // Normalize base URL
      const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Delete the article
      const response = await fetch(
        `${normalizedUrl}/api/articles/${postId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        return {
          ok: true,
          message: 'Post deleted successfully from Strapi'
        };
      } else {
        const error = await response.json();
        return {
          ok: false,
          message: `Failed to delete post: ${error.error?.message || response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to delete Strapi post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Strapi
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { baseUrl, apiToken } = auth;
      
      // Normalize base URL
      const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Create form data for file upload
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: this._getMimeType(filename) });
      formData.append('files', blob, filename);

      // Upload the file
      const response = await fetch(
        `${normalizedUrl}/api/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`
          },
          body: formData
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        const file = result[0];
        
        return {
          url: `${normalizedUrl}${file.url}`,
          id: file.id.toString()
        };
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Failed to upload image to Strapi:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Helper method to get MIME type from filename
   * @param {string} filename - Filename
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
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Helper method to generate a slug from title
   * @param {string} title - Post title
   * @returns {string} Generated slug
   */
  _generateSlug(title) {
    return title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

module.exports = new StrapiAdapter();