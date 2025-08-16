/**
 * Ghost Provider Adapter
 * 
 * Supports publishing to Ghost blogging platform
 * Implements the CMSAdapter interface
 */

class GhostAdapter {
  constructor() {
    this.id = 'ghost';
    this.name = 'Ghost';
    this.category = 'blogging';
    
    // Define supported features
    this.supports = {
      images: true,
      tags: true,
      scheduling: true,
      edit: true,
      delete: true,
      categories: false, // Ghost uses tags instead of categories
      excerpts: true,
      featuredImages: true,
      customFields: true
    };
  }

  /**
   * Verify connection to Ghost
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { siteUrl, apiKey, apiVersion = 'v5.0' } = auth;
      
      if (!siteUrl || !apiKey) {
        return {
          ok: false,
          details: 'Missing required credentials: siteUrl and apiKey'
        };
      }

      // Normalize site URL
      const normalizedUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

      // Test Ghost API access by fetching site info
      const response = await fetch(`${normalizedUrl}/ghost/api/${apiVersion}/site/`, {
        headers: {
          'Authorization': `Ghost ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const site = await response.json();
        return {
          ok: true,
          details: {
            siteUrl: normalizedUrl,
            siteName: site.site.title,
            siteDescription: site.site.description,
            apiVersion: apiVersion,
            version: site.site.version
          }
        };
      } else if (response.status === 401) {
        return {
          ok: false,
          details: 'Invalid API key'
        };
      } else if (response.status === 404) {
        return {
          ok: false,
          details: 'Site not found or API endpoint not available'
        };
      } else {
        return {
          ok: false,
          details: `Ghost API error: ${response.status}`
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
   * List posts from Ghost
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { siteUrl, apiKey, apiVersion = 'v5.0' } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // Normalize site URL
      const normalizedUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

      // Fetch posts from Ghost
      const response = await fetch(
        `${normalizedUrl}/ghost/api/${apiVersion}/content/posts/?key=${apiKey}&limit=${limit}&page=${page}&include=tags,authors&order=published_at DESC`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Ghost posts to our format
      const posts = data.posts.map(post => ({
        id: post.id,
        title: post.title || '',
        content: post.html || '',
        excerpt: post.excerpt || '',
        status: post.status || 'published',
        date: post.published_at || post.created_at,
        modified: post.updated_at,
        slug: post.slug || '',
        link: post.url || `${normalizedUrl}/${post.slug}/`,
        featuredImage: post.feature_image ? {
          url: post.feature_image,
          alt: post.feature_image_alt || ''
        } : null,
        categories: [], // Ghost doesn't have categories
        tags: post.tags ? post.tags.map(tag => tag.name) : [],
        author: post.primary_author ? post.primary_author.name : '',
        scheduledAt: post.published_at ? new Date(post.published_at) : null,
        metadata: {
          ghostId: post.id,
          uuid: post.uuid,
          slug: post.slug,
          status: post.status,
          visibility: post.visibility
        }
      }));

      return posts;
    } catch (error) {
      console.error('Failed to list Ghost posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Ghost
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { siteUrl, apiKey, apiVersion = 'v5.0' } = auth;
      
      // Normalize site URL
      const normalizedUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

      // Prepare the post data
      const postData = {
        posts: [{
          title: input.title,
          html: input.content,
          excerpt: input.excerpt || '',
          slug: this._generateSlug(input.title),
          status: input.scheduledAt ? 'draft' : 'published',
          tags: input.tags ? input.tags.map(tag => ({ name: tag })) : []
        }]
      };

      // Add featured image if provided
      if (input.featuredImage) {
        postData.posts[0].feature_image = input.featuredImage;
      }

      // Add scheduling if specified
      if (input.scheduledAt) {
        postData.posts[0].published_at = input.scheduledAt.toISOString();
      }

      // Create the post
      const response = await fetch(
        `${normalizedUrl}/ghost/api/${apiVersion}/admin/posts/?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Ghost ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postData)
        }
      );

      if (response.status === 201) {
        const result = await response.json();
        const post = result.posts[0];
        
        return {
          success: true,
          postId: post.id,
          externalId: post.id,
          url: post.url || `${normalizedUrl}/${post.slug}/`,
          message: 'Post created successfully on Ghost',
          metadata: {
            ghostId: post.id,
            uuid: post.uuid,
            slug: post.slug,
            status: post.status
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.errors?.[0]?.message || 'Failed to create post',
          message: `Ghost API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to create Ghost post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Ghost
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Ghost post ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { siteUrl, apiKey, apiVersion = 'v5.0' } = auth;
      
      // Normalize site URL
      const normalizedUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

      // Prepare updated data
      const updateData = {
        posts: [{
          id: postId
        }]
      };

      if (input.title) {
        updateData.posts[0].title = input.title;
      }
      
      if (input.content) {
        updateData.posts[0].html = input.content;
      }
      
      if (input.excerpt !== undefined) {
        updateData.posts[0].excerpt = input.excerpt;
      }
      
      if (input.tags) {
        updateData.posts[0].tags = input.tags.map(tag => ({ name: tag }));
      }
      
      if (input.featuredImage) {
        updateData.posts[0].feature_image = input.featuredImage;
      }
      
      if (input.scheduledAt) {
        updateData.posts[0].published_at = input.scheduledAt.toISOString();
        updateData.posts[0].status = 'draft';
      }

      // Update the post
      const response = await fetch(
        `${normalizedUrl}/ghost/api/${apiVersion}/admin/posts/${postId}/?key=${apiKey}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Ghost ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        const post = result.posts[0];
        
        return {
          success: true,
          postId: post.id,
          externalId: post.id,
          url: post.url || `${normalizedUrl}/${post.slug}/`,
          message: 'Post updated successfully on Ghost',
          metadata: {
            ghostId: post.id,
            uuid: post.uuid,
            slug: post.slug,
            status: post.status
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.errors?.[0]?.message || 'Failed to update post',
          message: `Ghost API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to update Ghost post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Ghost
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Ghost post ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { siteUrl, apiKey, apiVersion = 'v5.0' } = auth;
      
      // Normalize site URL
      const normalizedUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

      // Delete the post
      const response = await fetch(
        `${normalizedUrl}/ghost/api/${apiVersion}/admin/posts/${postId}/?key=${apiKey}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Ghost ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 204) {
        return {
          ok: true,
          message: 'Post deleted successfully from Ghost'
        };
      } else {
        const error = await response.json();
        return {
          ok: false,
          message: `Failed to delete post: ${error.errors?.[0]?.message || response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to delete Ghost post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Ghost
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { siteUrl, apiKey, apiVersion = 'v5.0' } = auth;
      
      // Normalize site URL
      const normalizedUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

      // Create form data for file upload
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: this._getMimeType(filename) });
      formData.append('file', blob, filename);

      // Upload the file
      const response = await fetch(
        `${normalizedUrl}/ghost/api/${apiVersion}/admin/images/upload/?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Ghost ${apiKey}`
          },
          body: formData
        }
      );

      if (response.status === 201) {
        const result = await response.json();
        const image = result.images[0];
        
        return {
          url: image.url,
          id: image.id
        };
      } else {
        const error = await response.json();
        throw new Error(error.errors?.[0]?.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Failed to upload image to Ghost:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Get tags from Ghost
   * @param {object} auth - Authentication credentials
   * @returns {Promise<Array>}
   */
  async getTags(auth) {
    try {
      const { siteUrl, apiKey, apiVersion = 'v5.0' } = auth;
      
      // Normalize site URL
      const normalizedUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

      const response = await fetch(
        `${normalizedUrl}/ghost/api/${apiVersion}/content/tags/?key=${apiKey}&limit=all`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        const data = await response.json();
        return data.tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          description: tag.description
        }));
      } else {
        throw new Error(`Failed to fetch tags: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to get Ghost tags:', error);
      throw new Error(`Failed to get tags: ${error.message}`);
    }
  }

  /**
   * Get authors from Ghost
   * @param {object} auth - Authentication credentials
   * @returns {Promise<Array>}
   */
  async getAuthors(auth) {
    try {
      const { siteUrl, apiKey, apiVersion = 'v5.0' } = auth;
      
      // Normalize site URL
      const normalizedUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

      const response = await fetch(
        `${normalizedUrl}/ghost/api/${apiVersion}/content/authors/?key=${apiKey}&limit=all`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        const data = await response.json();
        return data.authors.map(author => ({
          id: author.id,
          name: author.name,
          slug: author.slug,
          bio: author.bio,
          profile_image: author.profile_image
        }));
      } else {
        throw new Error(`Failed to fetch authors: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to get Ghost authors:', error);
      throw new Error(`Failed to get authors: ${error.message}`);
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

module.exports = new GhostAdapter();