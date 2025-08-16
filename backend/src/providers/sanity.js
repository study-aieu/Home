/**
 * Sanity Provider Adapter
 * 
 * Supports publishing to Sanity headless CMS
 * Implements the CMSAdapter interface
 */

class SanityAdapter {
  constructor() {
    this.id = 'sanity';
    this.name = 'Sanity';
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
   * Verify connection to Sanity
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { projectId, dataset, apiToken } = auth;
      
      if (!projectId || !dataset || !apiToken) {
        return {
          ok: false,
          details: 'Missing required credentials: projectId, dataset, and apiToken'
        };
      }

      // Test Sanity API access by fetching project info
      const response = await fetch(`https://${projectId}.api.sanity.io/v2021-06-07/data/query/${dataset}?query=*[_type == "sanity.imageAsset"][0]`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const data = await response.json();
        return {
          ok: true,
          details: {
            projectId: projectId,
            dataset: dataset,
            apiVersion: 'v2021-06-07',
            hasAssets: !!data.result
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
          details: `Sanity API error: ${response.status}`
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
   * List posts from Sanity
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { projectId, dataset, apiToken } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // GROQ query to fetch blog posts
      const query = `*[_type == "post"] | order(publishedAt desc) [${offset}...${offset + limit}] {
        _id,
        title,
        body,
        excerpt,
        publishedAt,
        _createdAt,
        _updatedAt,
        slug,
        "featuredImage": featuredImage.asset->url,
        "featuredImageAlt": featuredImage.alt,
        categories[]->{name},
        tags,
        author->{name}
      }`;

      // Fetch posts from Sanity
      const response = await fetch(
        `https://${projectId}.api.sanity.io/v2021-06-07/data/query/${dataset}?query=${encodeURIComponent(query)}`,
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
      
      // Transform Sanity posts to our format
      const posts = data.result.map(post => ({
        id: post._id,
        title: post.title || '',
        content: post.body || '',
        excerpt: post.excerpt || '',
        status: post.publishedAt ? 'published' : 'draft',
        date: post.publishedAt || post._createdAt,
        modified: post._updatedAt,
        slug: post.slug?.current || '',
        link: post.slug?.current ? `https://yourdomain.com/blog/${post.slug.current}` : '',
        featuredImage: post.featuredImage ? {
          url: post.featuredImage,
          alt: post.featuredImageAlt || ''
        } : null,
        categories: post.categories ? post.categories.map(cat => cat.name) : [],
        tags: post.tags || [],
        author: post.author?.name || '',
        scheduledAt: post.publishedAt ? new Date(post.publishedAt) : null,
        metadata: {
          sanityId: post._id,
          slug: post.slug?.current
        }
      }));

      return posts;
    } catch (error) {
      console.error('Failed to list Sanity posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Sanity
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { projectId, dataset, apiToken } = auth;
      
      // Prepare the post data
      const postData = {
        _type: 'post',
        title: input.title,
        body: input.content,
        excerpt: input.excerpt || '',
        slug: {
          _type: 'slug',
          current: this._generateSlug(input.title)
        },
        publishedAt: input.scheduledAt ? input.scheduledAt.toISOString() : new Date().toISOString()
      };

      // Add tags if provided
      if (input.tags && input.tags.length > 0) {
        postData.tags = input.tags;
      }

      // Add categories if provided
      if (input.categories && input.categories.length > 0) {
        postData.categories = input.categories.map(category => ({
          _type: 'reference',
          _ref: category // Assuming categories are references
        }));
      }

      // Add author if provided
      if (input.author) {
        postData.author = {
          _type: 'reference',
          _ref: input.author // Assuming author is a reference
        };
      }

      // Add featured image if provided
      if (input.featuredImage) {
        postData.featuredImage = {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: input.featuredImage
          },
          alt: input.title
        };
      }

      // Create the post using Sanity's mutations API
      const mutation = {
        mutations: [
          {
            create: postData
          }
        ]
      };

      const response = await fetch(
        `https://${projectId}.api.sanity.io/v2021-06-07/data/mutate/${dataset}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mutation)
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        const postId = result.results[0].id;
        
        return {
          success: true,
          postId: postId,
          externalId: postId,
          url: `https://yourdomain.com/blog/${this._generateSlug(input.title)}`,
          message: 'Post created successfully on Sanity',
          metadata: {
            sanityId: postId,
            slug: this._generateSlug(input.title)
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to create post',
          message: `Sanity API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to create Sanity post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Sanity
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Sanity post ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { projectId, dataset, apiToken } = auth;
      
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
        updateData.categories = input.categories.map(category => ({
          _type: 'reference',
          _ref: category
        }));
      }
      
      if (input.author) {
        updateData.author = {
          _type: 'reference',
          _ref: input.author
        };
      }
      
      if (input.featuredImage) {
        updateData.featuredImage = {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: input.featuredImage
          },
          alt: input.title || 'Featured image'
        };
      }
      
      if (input.scheduledAt) {
        updateData.publishedAt = input.scheduledAt.toISOString();
      }

      // Update the post using Sanity's mutations API
      const mutation = {
        mutations: [
          {
            patch: {
              id: postId,
              set: updateData
            }
          }
        ]
      };

      const response = await fetch(
        `https://${projectId}.api.sanity.io/v2021-06-07/data/mutate/${dataset}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mutation)
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        
        return {
          success: true,
          postId: postId,
          externalId: postId,
          url: `https://yourdomain.com/blog/${this._generateSlug(input.title || 'updated-post')}`,
          message: 'Post updated successfully on Sanity',
          metadata: {
            sanityId: postId,
            slug: this._generateSlug(input.title || 'updated-post')
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to update post',
          message: `Sanity API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to update Sanity post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Sanity
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Sanity post ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { projectId, dataset, apiToken } = auth;
      
      // Delete the post using Sanity's mutations API
      const mutation = {
        mutations: [
          {
            delete: {
              id: postId
            }
          }
        ]
      };

      const response = await fetch(
        `https://${projectId}.api.sanity.io/v2021-06-07/data/mutate/${dataset}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mutation)
        }
      );

      if (response.status === 200) {
        return {
          ok: true,
          message: 'Post deleted successfully from Sanity'
        };
      } else {
        const error = await response.json();
        return {
          ok: false,
          message: `Failed to delete post: ${error.message || response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to delete Sanity post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Sanity
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { projectId, dataset, apiToken } = auth;
      
      // First, create an asset document
      const assetData = {
        _type: 'sanity.imageAsset',
        originalFilename: filename,
        label: filename,
        title: filename,
        description: `Image: ${filename}`,
        altText: filename
      };

      // Create the asset using Sanity's mutations API
      const createMutation = {
        mutations: [
          {
            create: assetData
          }
        ]
      };

      const createResponse = await fetch(
        `https://${projectId}.api.sanity.io/v2021-06-07/data/mutate/${dataset}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createMutation)
        }
      );

      if (createResponse.status !== 200) {
        const error = await createResponse.json();
        throw new Error(error.message || 'Failed to create asset');
      }

      const createResult = await createResponse.json();
      const assetId = createResult.results[0].id;

      // Now upload the actual file
      const uploadResponse = await fetch(
        `https://${projectId}.api.sanity.io/v2021-06-07/assets/images/${dataset}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': this._getMimeType(filename)
          },
          body: fileBuffer
        }
      );

      if (uploadResponse.status !== 200) {
        const error = await uploadResponse.json();
        throw new Error(error.message || 'Failed to upload image');
      }

      const uploadResult = await uploadResponse.json();
      
      return {
        url: uploadResult.url,
        id: assetId
      };
    } catch (error) {
      console.error('Failed to upload image to Sanity:', error);
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

module.exports = new SanityAdapter();