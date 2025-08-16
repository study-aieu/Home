/**
 * Wix Provider Adapter
 * 
 * Supports publishing to Wix website builder
 * Implements the CMSAdapter interface
 */

class WixAdapter {
  constructor() {
    this.id = 'wix';
    this.name = 'Wix';
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
   * Verify connection to Wix
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { siteId, accessToken, apiKey } = auth;
      
      if (!siteId || !accessToken || !apiKey) {
        return {
          ok: false,
          details: 'Missing required credentials: siteId, accessToken, and apiKey'
        };
      }

      // Test Wix API access by fetching site info
      const response = await fetch(`https://www.wixapis.com/v1/sites/${siteId}`, {
        headers: {
          'Authorization': accessToken,
          'wix-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const site = await response.json();
        return {
          ok: true,
          details: {
            siteId: siteId,
            siteName: site.site.name,
            siteUrl: site.site.url,
            plan: site.site.plan,
            locale: site.site.locale
          }
        };
      } else if (response.status === 401) {
        return {
          ok: false,
          details: 'Invalid access token or API key'
        };
      } else if (response.status === 404) {
        return {
          ok: false,
          details: 'Site not found or access denied'
        };
      } else {
        return {
          ok: false,
          details: `Wix API error: ${response.status}`
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
   * List posts from Wix
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { siteId, accessToken, apiKey } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Fetch blog posts from Wix
      const response = await fetch(
        `https://www.wixapis.com/v1/blog/v3/posts?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': accessToken,
            'wix-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Wix posts to our format
      const posts = data.posts.map(post => ({
        id: post.id,
        title: post.title || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        status: post.published ? 'published' : 'draft',
        date: post.publishedDate || post.createdDate,
        modified: post.lastUpdated,
        slug: post.slug || '',
        link: post.slug ? `https://yourdomain.com/blog/${post.slug}` : '',
        featuredImage: post.coverImage ? {
          url: post.coverImage.url,
          alt: post.coverImage.altText || ''
        } : null,
        categories: post.categories || [],
        tags: post.tags || [],
        author: post.author ? post.author.name : '',
        scheduledAt: post.scheduledDate || null,
        metadata: {
          wixId: post.id,
          revision: post.revision,
          hasCoverImage: !!post.coverImage
        }
      }));

      return posts;
    } catch (error) {
      console.error('Failed to list Wix posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Wix
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { siteId, accessToken, apiKey } = auth;
      
      // Prepare the post data
      const postData = {
        title: input.title,
        content: input.content,
        excerpt: input.excerpt || '',
        slug: this._generateSlug(input.title),
        tags: input.tags || [],
        categories: input.categories || [],
        published: !input.scheduledAt
      };

      // Add scheduling if specified
      if (input.scheduledAt) {
        postData.scheduledDate = input.scheduledAt.toISOString();
      }

      // Add featured image if provided
      if (input.featuredImage) {
        postData.coverImage = {
          url: input.featuredImage,
          altText: input.title
        };
      }

      // Create the post
      const response = await fetch(
        'https://www.wixapis.com/v1/blog/v3/posts',
        {
          method: 'POST',
          headers: {
            'Authorization': accessToken,
            'wix-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postData)
        }
      );

      if (response.status === 201) {
        const result = await response.json();
        
        return {
          success: true,
          postId: result.post.id,
          externalId: result.post.id,
          url: `https://yourdomain.com/blog/${result.post.slug}`,
          message: 'Post created successfully on Wix',
          metadata: {
            wixId: result.post.id,
            revision: result.post.revision,
            slug: result.post.slug
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to create post',
          message: `Wix API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to create Wix post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Wix
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Wix post ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { siteId, accessToken, apiKey } = auth;
      
      // First, get the current post to get the revision
      const getResponse = await fetch(
        `https://www.wixapis.com/v1/blog/v3/posts/${postId}`,
        {
          headers: {
            'Authorization': accessToken,
            'wix-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (getResponse.status !== 200) {
        return {
          success: false,
          error: 'Post not found',
          message: `Failed to fetch post: ${getResponse.status}`
        };
      }

      const currentPost = await getResponse.json();
      
      // Prepare updated data
      const updateData = {
        revision: currentPost.post.revision
      };

      if (input.title) {
        updateData.title = input.title;
      }
      
      if (input.content) {
        updateData.content = input.content;
      }
      
      if (input.excerpt !== undefined) {
        updateData.excerpt = input.excerpt;
      }
      
      if (input.tags) {
        updateData.tags = input.tags;
      }
      
      if (input.categories) {
        updateData.categories = input.categories;
      }
      
      if (input.featuredImage) {
        updateData.coverImage = {
          url: input.featuredImage,
          altText: input.title || currentPost.post.title
        };
      }
      
      if (input.scheduledAt) {
        updateData.scheduledDate = input.scheduledAt.toISOString();
        updateData.published = false;
      }

      // Update the post
      const updateResponse = await fetch(
        `https://www.wixapis.com/v1/blog/v3/posts/${postId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': accessToken,
            'wix-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (updateResponse.status === 200) {
        const result = await updateResponse.json();
        
        return {
          success: true,
          postId: result.post.id,
          externalId: result.post.id,
          url: `https://yourdomain.com/blog/${result.post.slug}`,
          message: 'Post updated successfully on Wix',
          metadata: {
            wixId: result.post.id,
            revision: result.post.revision,
            slug: result.post.slug
          }
        };
      } else {
        const error = await updateResponse.json();
        return {
          success: false,
          error: error.message || 'Failed to update post',
          message: `Wix API error: ${updateResponse.status}`
        };
      }
    } catch (error) {
      console.error('Failed to update Wix post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Wix
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Wix post ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { siteId, accessToken, apiKey } = auth;
      
      // Delete the post
      const response = await fetch(
        `https://www.wixapis.com/v1/blog/v3/posts/${postId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': accessToken,
            'wix-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        return {
          ok: true,
          message: 'Post deleted successfully from Wix'
        };
      } else {
        const error = await response.json();
        return {
          ok: false,
          message: `Failed to delete post: ${error.message || response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to delete Wix post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Wix
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { siteId, accessToken, apiKey } = auth;
      
      // First, get upload URL
      const uploadUrlResponse = await fetch(
        'https://www.wixapis.com/v1/files/upload-url',
        {
          method: 'POST',
          headers: {
            'Authorization': accessToken,
            'wix-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileName: filename,
            mimeType: this._getMimeType(filename)
          })
        }
      );

      if (uploadUrlResponse.status !== 200) {
        const error = await uploadUrlResponse.json();
        throw new Error(error.message || 'Failed to get upload URL');
      }

      const uploadData = await uploadUrlResponse.json();
      
      // Upload the file to the provided URL
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'POST',
        body: fileBuffer,
        headers: {
          'Content-Type': this._getMimeType(filename)
        }
      });

      if (uploadResponse.status !== 200) {
        throw new Error('Failed to upload file to Wix');
      }

      // Commit the upload
      const commitResponse = await fetch(
        'https://www.wixapis.com/v1/files/commit',
        {
          method: 'POST',
          headers: {
            'Authorization': accessToken,
            'wix-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileDescriptor: uploadData.fileDescriptor
          })
        }
      );

      if (commitResponse.status !== 200) {
        const error = await commitResponse.json();
        throw new Error(error.message || 'Failed to commit file');
      }

      const commitResult = await commitResponse.json();

      return {
        url: commitResult.file.url,
        id: commitResult.file.id
      };
    } catch (error) {
      console.error('Failed to upload image to Wix:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
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
}

module.exports = new WixAdapter();