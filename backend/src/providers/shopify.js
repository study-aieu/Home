/**
 * Shopify Provider Adapter
 * 
 * Supports publishing to Shopify blog
 * Implements the CMSAdapter interface
 */

class ShopifyAdapter {
  constructor() {
    this.id = 'shopify';
    this.name = 'Shopify';
    this.category = 'e-commerce';
    
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
   * Verify connection to Shopify
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { shopDomain, accessToken, apiVersion = '2023-10' } = auth;
      
      if (!shopDomain || !accessToken) {
        return {
          ok: false,
          details: 'Missing required credentials: shopDomain and accessToken'
        };
      }

      // Normalize shop domain
      const normalizedDomain = shopDomain.includes('.myshopify.com') 
        ? shopDomain 
        : `${shopDomain}.myshopify.com`;

      // Test Shopify API access by fetching shop info
      const response = await fetch(`https://${normalizedDomain}/admin/api/${apiVersion}/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const shop = await response.json();
        return {
          ok: true,
          details: {
            shopDomain: normalizedDomain,
            shopName: shop.shop.name,
            shopUrl: shop.shop.domain,
            plan: shop.shop.plan_name,
            currency: shop.shop.currency,
            timezone: shop.shop.iana_timezone
          }
        };
      } else if (response.status === 401) {
        return {
          ok: false,
          details: 'Invalid access token'
        };
      } else if (response.status === 403) {
        return {
          ok: false,
          details: 'Access denied - insufficient permissions'
        };
      } else {
        return {
          ok: false,
          details: `Shopify API error: ${response.status}`
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
   * List posts from Shopify blog
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { shopDomain, accessToken, apiVersion = '2023-10' } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // Normalize shop domain
      const normalizedDomain = shopDomain.includes('.myshopify.com') 
        ? shopDomain 
        : `${shopDomain}.myshopify.com`;

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Fetch blog posts from Shopify
      const response = await fetch(
        `https://${normalizedDomain}/admin/api/${apiVersion}/articles.json?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Shopify articles to our format
      const posts = data.articles.map(article => ({
        id: article.id.toString(),
        title: article.title || '',
        content: article.body_html || '',
        excerpt: article.summary_html || '',
        status: article.published ? 'published' : 'draft',
        date: article.published_at || article.created_at,
        modified: article.updated_at,
        slug: article.handle || '',
        link: article.url || `https://${normalizedDomain}/blogs/news/${article.handle}`,
        featuredImage: article.image ? {
          url: article.image.src,
          alt: article.image.alt || ''
        } : null,
        categories: article.blog_id ? [article.blog_id.toString()] : [],
        tags: article.tags ? article.tags.split(',').map(tag => tag.trim()) : [],
        author: article.author || '',
        scheduledAt: article.published_at ? new Date(article.published_at) : null,
        metadata: {
          shopifyId: article.id,
          blogId: article.blog_id,
          handle: article.handle,
          templateSuffix: article.template_suffix
        }
      }));

      return posts;
    } catch (error) {
      console.error('Failed to list Shopify posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Shopify
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { shopDomain, accessToken, apiVersion = '2023-10', blogId = '1' } = auth;
      
      // Normalize shop domain
      const normalizedDomain = shopDomain.includes('.myshopify.com') 
        ? shopDomain 
        : `${shopDomain}.myshopify.com`;

      // Prepare the article data
      const articleData = {
        article: {
          title: input.title,
          body_html: input.content,
          summary_html: input.excerpt || '',
          tags: input.tags ? input.tags.join(', ') : '',
          blog_id: parseInt(blogId),
          published: !input.scheduledAt
        }
      };

      // Add scheduling if specified
      if (input.scheduledAt) {
        articleData.article.published_at = input.scheduledAt.toISOString();
        articleData.article.published = false;
      }

      // Add featured image if provided
      if (input.featuredImage) {
        articleData.article.image = {
          src: input.featuredImage,
          alt: input.title
        };
      }

      // Create the article
      const response = await fetch(
        `https://${normalizedDomain}/admin/api/${apiVersion}/articles.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(articleData)
        }
      );

      if (response.status === 201) {
        const result = await response.json();
        const article = result.article;
        
        return {
          success: true,
          postId: article.id.toString(),
          externalId: article.id.toString(),
          url: article.url || `https://${normalizedDomain}/blogs/news/${article.handle}`,
          message: 'Post created successfully on Shopify',
          metadata: {
            shopifyId: article.id,
            blogId: article.blog_id,
            handle: article.handle,
            templateSuffix: article.template_suffix
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.errors || 'Failed to create post',
          message: `Shopify API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to create Shopify post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Shopify
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Shopify article ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { shopDomain, accessToken, apiVersion = '2023-10' } = auth;
      
      // Normalize shop domain
      const normalizedDomain = shopDomain.includes('.myshopify.com') 
        ? shopDomain 
        : `${shopDomain}.myshopify.com`;

      // Prepare updated data
      const updateData = {
        article: {}
      };

      if (input.title) {
        updateData.article.title = input.title;
      }
      
      if (input.content) {
        updateData.article.body_html = input.content;
      }
      
      if (input.excerpt !== undefined) {
        updateData.article.summary_html = input.excerpt;
      }
      
      if (input.tags) {
        updateData.article.tags = input.tags.join(', ');
      }
      
      if (input.featuredImage) {
        updateData.article.image = {
          src: input.featuredImage,
          alt: input.title || 'Featured image'
        };
      }
      
      if (input.scheduledAt) {
        updateData.article.published_at = input.scheduledAt.toISOString();
        updateData.article.published = false;
      }

      // Update the article
      const response = await fetch(
        `https://${normalizedDomain}/admin/api/${apiVersion}/articles/${postId}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        const article = result.article;
        
        return {
          success: true,
          postId: article.id.toString(),
          externalId: article.id.toString(),
          url: article.url || `https://${normalizedDomain}/blogs/news/${article.handle}`,
          message: 'Post updated successfully on Shopify',
          metadata: {
            shopifyId: article.id,
            blogId: article.blog_id,
            handle: article.handle,
            templateSuffix: article.template_suffix
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.errors || 'Failed to update post',
          message: `Shopify API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to update Shopify post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Shopify
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Shopify article ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { shopDomain, accessToken, apiVersion = '2023-10' } = auth;
      
      // Normalize shop domain
      const normalizedDomain = shopDomain.includes('.myshopify.com') 
        ? shopDomain 
        : `${shopDomain}.myshopify.com`;

      // Delete the article
      const response = await fetch(
        `https://${normalizedDomain}/admin/api/${apiVersion}/articles/${postId}.json`,
        {
          method: 'DELETE',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        return {
          ok: true,
          message: 'Post deleted successfully from Shopify'
        };
      } else {
        const error = await response.json();
        return {
          ok: false,
          message: `Failed to delete post: ${error.errors || response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to delete Shopify post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Shopify
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { shopDomain, accessToken, apiVersion = '2023-10' } = auth;
      
      // Normalize shop domain
      const normalizedDomain = shopDomain.includes('.myshopify.com') 
        ? shopDomain 
        : `${shopDomain}.myshopify.com`;

      // First, create an asset
      const assetData = {
        asset: {
          key: `assets/${filename}`,
          attachment: fileBuffer.toString('base64'),
          content_type: this._getMimeType(filename)
        }
      };

      const response = await fetch(
        `https://${normalizedDomain}/admin/api/${apiVersion}/themes/current/assets.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(assetData)
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        const asset = result.asset;
        
        return {
          url: asset.public_url,
          id: asset.key
        };
      } else {
        const error = await response.json();
        throw new Error(error.errors || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Failed to upload image to Shopify:', error);
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

module.exports = new ShopifyAdapter();