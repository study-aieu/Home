/**
 * Medium Provider Adapter
 * 
 * Supports Medium.com publishing via their API
 * Implements the CMSAdapter interface
 */

const axios = require('axios');

class MediumAdapter {
  constructor() {
    this.id = 'medium';
    this.name = 'Medium';
    this.category = 'cms';
    
    // Define supported features
    this.supports = {
      images: true,
      tags: true,
      scheduling: false, // Medium doesn't support scheduling
      edit: true,
      delete: true,
      categories: false, // Medium uses tags instead
      excerpts: true,
      featuredImages: true,
      customFields: false
    };
  }

  /**
   * Verify connection to Medium
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { accessToken } = auth;
      
      if (!accessToken) {
        return {
          ok: false,
          details: 'Missing required credential: accessToken'
        };
      }

      // Test connection by fetching user info
      const response = await axios.get('https://api.medium.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data.data) {
        const user = response.data.data;
        return {
          ok: true,
          details: {
            userId: user.id,
            userName: user.name,
            userUrl: user.url,
            username: user.username
          }
        };
      }

      return {
        ok: false,
        details: 'Failed to authenticate with Medium'
      };
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          return {
            ok: false,
            details: 'Invalid access token'
          };
        } else if (error.response.status === 403) {
          return {
            ok: false,
            details: 'Insufficient permissions'
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
   * List posts from Medium
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { accessToken } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // First get user info to get userId
      const userResponse = await axios.get('https://api.medium.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (!userResponse.data.data) {
        throw new Error('Failed to get user information');
      }

      const userId = userResponse.data.data.id;
      
      // Get user's publications
      const publicationsResponse = await axios.get(`https://api.medium.com/v1/users/${userId}/publications`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const posts = [];
      
      // Get posts from personal profile
      const profilePostsResponse = await axios.get(`https://api.medium.com/v1/users/${userId}/posts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (profilePostsResponse.data.data) {
        posts.push(...profilePostsResponse.data.data);
      }

      // Get posts from publications
      if (publicationsResponse.data.data) {
        for (const publication of publicationsResponse.data.data) {
          const pubPostsResponse = await axios.get(`https://api.medium.com/v1/publications/${publication.id}/posts`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          });

          if (pubPostsResponse.data.data) {
            posts.push(...pubPostsResponse.data.data);
          }
        }
      }

      // Sort posts by published date and apply pagination
      const sortedPosts = posts
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice((page - 1) * limit, page * limit);

      return sortedPosts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        excerpt: post.subtitle || '',
        status: post.status,
        date: post.publishedAt,
        modified: post.updatedAt,
        slug: post.uniqueSlug,
        link: post.url,
        featuredImage: post.virtuals?.previewImage?.imageId ? 
          `https://cdn-images-1.medium.com/max/800/${post.virtuals.previewImage.imageId}` : null,
        categories: [],
        tags: post.virtuals?.tags?.map(tag => tag.name) || [],
        author: post.author?.name,
        metadata: {
          mediumId: post.id,
          uniqueSlug: post.uniqueSlug,
          url: post.url,
          publicationId: post.publicationId
        }
      }));
    } catch (error) {
      console.error('Failed to list Medium posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Medium
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { accessToken } = auth;
      
      // First get user info to get userId
      const userResponse = await axios.get('https://api.medium.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (!userResponse.data.data) {
        throw new Error('Failed to get user information');
      }

      const userId = userResponse.data.data.id;
      
      // Prepare post data for Medium
      const postData = {
        title: input.title,
        contentFormat: 'markdown',
        content: input.content,
        tags: input.tags || [],
        publishStatus: input.status === 'published' ? 'public' : 'draft'
      };

      // Add subtitle if excerpt is provided
      if (input.excerpt) {
        postData.subtitle = input.excerpt;
      }

      // Determine where to publish (personal profile or publication)
      let publishUrl = `https://api.medium.com/v1/users/${userId}/posts`;
      
      if (input.customFields?.publicationId) {
        publishUrl = `https://api.medium.com/v1/publications/${input.customFields.publicationId}/posts`;
      }

      const response = await axios.post(publishUrl, postData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 201) {
        const post = response.data.data;
        return {
          success: true,
          postId: post.id,
          externalId: post.id,
          url: post.url,
          message: 'Post created successfully on Medium',
          metadata: {
            mediumId: post.id,
            uniqueSlug: post.uniqueSlug,
            url: post.url,
            publicationId: post.publicationId,
            status: post.status
          }
        };
      }

      return {
        success: false,
        error: 'Failed to create post on Medium',
        message: 'Unexpected response from Medium API'
      };
    } catch (error) {
      console.error('Failed to create Medium post:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.errors?.[0]?.message || 'Unknown Medium error';
        return {
          success: false,
          error: errorMessage,
          message: `Medium API error: ${errorMessage}`
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
   * Update an existing post on Medium
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Medium post ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { accessToken } = auth;
      
      // Prepare update data
      const updateData = {};
      
      if (input.title) updateData.title = input.title;
      if (input.content) updateData.content = input.content;
      if (input.excerpt !== undefined) updateData.subtitle = input.excerpt;
      if (input.status) updateData.publishStatus = input.status === 'published' ? 'public' : 'draft';
      if (input.tags) updateData.tags = input.tags;

      // Medium doesn't support updating posts via API
      // We need to create a new post and delete the old one
      const createResult = await this.createPost(auth, input);
      
      if (createResult.success) {
        // Delete the old post
        await this.deletePost(auth, postId);
        
        return {
          success: true,
          postId: createResult.postId,
          externalId: createResult.externalId,
          url: createResult.url,
          message: 'Post updated successfully on Medium (replaced with new post)',
          metadata: {
            ...createResult.metadata,
            originalPostId: postId,
            note: 'Medium doesn\'t support post updates, so the old post was replaced'
          }
        };
      }

      return createResult;
    } catch (error) {
      console.error('Failed to update Medium post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Medium
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Medium post ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { accessToken } = auth;
      
      // Medium doesn't support deleting posts via API
      // Posts can only be unpublished (set to draft status)
      const updateData = {
        publishStatus: 'draft'
      };

      const response = await axios.put(`https://api.medium.com/v1/posts/${postId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.status === 200) {
        return {
          ok: true,
          message: 'Post unpublished successfully from Medium (set to draft status)'
        };
      }

      return {
        ok: false,
        message: 'Failed to unpublish post from Medium'
      };
    } catch (error) {
      console.error('Failed to unpublish Medium post:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.errors?.[0]?.message || 'Unknown Medium error';
        return {
          ok: false,
          message: `Medium API error: ${errorMessage}`
        };
      }

      return {
        ok: false,
        message: `Failed to unpublish post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Medium
   * Note: Medium doesn't have a direct image upload API
   * Images are embedded via URLs in the content
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    // Medium doesn't support direct image uploads
    // Images must be hosted elsewhere and referenced via URL
    throw new Error('Medium does not support direct image uploads. Please host images elsewhere and provide URLs.');
  }

  /**
   * Get user's publications
   * @param {object} auth - Authentication credentials
   * @returns {Promise<Array>}
   */
  async getPublications(auth) {
    try {
      const { accessToken } = auth;
      
      const userResponse = await axios.get('https://api.medium.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (!userResponse.data.data) {
        throw new Error('Failed to get user information');
      }

      const userId = userResponse.data.data.id;
      
      const response = await axios.get(`https://api.medium.com/v1/users/${userId}/publications`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get Medium publications:', error);
      throw new Error(`Failed to fetch publications: ${error.message}`);
    }
  }
}

module.exports = new MediumAdapter();