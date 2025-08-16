/**
 * Squarespace Provider Adapter
 * 
 * Supports publishing to Squarespace website builder
 * Implements the CMSAdapter interface
 */

class SquarespaceAdapter {
  constructor() {
    this.id = 'squarespace';
    this.name = 'Squarespace';
    this.category = 'website-builder';
    
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
   * Verify connection to Squarespace
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { siteId, apiKey } = auth;
      
      if (!siteId || !apiKey) {
        return {
          ok: false,
          details: 'Missing required credentials: siteId and apiKey'
        };
      }

      // Test Squarespace API access by fetching site info
      const response = await fetch(`https://api.squarespace.com/1.0/sites/${siteId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const site = await response.json();
        return {
          ok: true,
          details: {
            siteId: siteId,
            siteName: site.title,
            siteUrl: site.siteUrl,
            plan: site.plan,
            locale: site.locale,
            timezone: site.timezone
          }
        };
      } else if (response.status === 401) {
        return {
          ok: false,
          details: 'Invalid API key'
        };
      } else if (response.status === 403) {
        return {
          ok: false,
          details: 'Access denied - insufficient permissions'
        };
      } else if (response.status === 404) {
        return {
          ok: false,
          details: 'Site not found'
        };
      } else {
        return {
          ok: false,
          details: `Squarespace API error: ${response.status}`
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
   * List posts from Squarespace
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { siteId, apiKey } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Fetch blog posts from Squarespace
      const response = await fetch(
        `https://api.squarespace.com/1.0/sites/${siteId}/blog/posts?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Squarespace posts to our format
      const posts = data.posts.map(post => ({
        id: post.id,
        title: post.title || '',
        content: post.body || '',
        excerpt: post.excerpt || '',
        status: post.published ? 'published' : 'draft',
        date: post.publishedOn || post.createdOn,
        modified: post.updatedOn,
        slug: post.urlId || '',
        link: post.fullUrl || `https://yourdomain.com/blog/${post.urlId}`,
        featuredImage: post.thumbnailUrl ? {
          url: post.thumbnailUrl,
          alt: post.title || ''
        } : null,
        categories: post.category ? [post.category] : [],
        tags: post.tags || [],
        author: post.author || '',
        scheduledAt: post.scheduledOn || null,
        metadata: {
          squarespaceId: post.id,
          urlId: post.urlId,
          fullUrl: post.fullUrl,
          category: post.category
        }
      }));

      return posts;
    } catch (error) {
      console.error('Failed to list Squarespace posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Squarespace
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { siteId, apiKey } = auth;
      
      // Prepare the post data
      const postData = {
        title: input.title,
        body: input.content,
        excerpt: input.excerpt || '',
        tags: input.tags || [],
        category: input.categories && input.categories.length > 0 ? input.categories[0] : null,
        published: !input.scheduledAt
      };

      // Add scheduling if specified
      if (input.scheduledAt) {
        postData.scheduledOn = input.scheduledAt.toISOString();
        postData.published = false;
      }

      // Add featured image if provided
      if (input.featuredImage) {
        postData.thumbnailUrl = input.featuredImage;
      }

      // Create the post
      const response = await fetch(
        `https://api.squarespace.com/1.0/sites/${siteId}/blog/posts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postData)
        }
      );

      if (response.status === 201) {
        const result = await response.json();
        const post = result.post;
        
        return {
          success: true,
          postId: post.id,
          externalId: post.id,
          url: post.fullUrl || `https://yourdomain.com/blog/${post.urlId}`,
          message: 'Post created successfully on Squarespace',
          metadata: {
            squarespaceId: post.id,
            urlId: post.urlId,
            fullUrl: post.fullUrl,
            category: post.category
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to create post',
          message: `Squarespace API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to create Squarespace post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Squarespace
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Squarespace post ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { siteId, apiKey } = auth;
      
      // Prepare updated data
      const updateData = {};

      if (input.title) {
        updateData.title = input.title;
      }
      
      if (input.content) {
        updateData.body = input.content;
      }
      
      if (input.excerpt !== undefined) {
        updateData.excerpt = input.excerpt;
      }
      
      if (input.tags) {
        updateData.tags = input.tags;
      }
      
      if (input.categories) {
        updateData.category = input.categories.length > 0 ? input.categories[0] : null;
      }
      
      if (input.featuredImage) {
        updateData.thumbnailUrl = input.featuredImage;
      }
      
      if (input.scheduledAt) {
        updateData.scheduledOn = input.scheduledAt.toISOString();
        updateData.published = false;
      }

      // Update the post
      const response = await fetch(
        `https://api.squarespace.com/1.0/sites/${siteId}/blog/posts/${postId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        const post = result.post;
        
        return {
          success: true,
          postId: post.id,
          externalId: post.id,
          url: post.fullUrl || `https://yourdomain.com/blog/${post.urlId}`,
          message: 'Post updated successfully on Squarespace',
          metadata: {
            squarespaceId: post.id,
            urlId: post.urlId,
            fullUrl: post.fullUrl,
            category: post.category
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to update post',
          message: `Squarespace API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to update Squarespace post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Squarespace
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Squarespace post ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { siteId, apiKey } = auth;
      
      // Delete the post
      const response = await fetch(
        `https://api.squarespace.com/1.0/sites/${siteId}/blog/posts/${postId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 204) {
        return {
          ok: true,
          message: 'Post deleted successfully from Squarespace'
        };
      } else {
        const error = await response.json();
        return {
          ok: false,
          message: `Failed to delete post: ${error.message || response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to delete Squarespace post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Squarespace
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { siteId, apiKey } = auth;
      
      // First, create an asset
      const assetData = {
        filename: filename,
        contentType: this._getMimeType(filename),
        data: fileBuffer.toString('base64')
      };

      const response = await fetch(
        `https://api.squarespace.com/1.0/sites/${siteId}/assets`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(assetData)
        }
      );

      if (response.status === 201) {
        const result = await response.json();
        const asset = result.asset;
        
        return {
          url: asset.url,
          id: asset.id
        };
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Failed to upload image to Squarespace:', error);
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

module.exports = new SquarespaceAdapter();