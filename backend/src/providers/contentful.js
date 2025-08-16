/**
 * Contentful Provider Adapter
 * 
 * Supports publishing to Contentful headless CMS
 * Implements the CMSAdapter interface
 */

class ContentfulAdapter {
  constructor() {
    this.id = 'contentful';
    this.name = 'Contentful';
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
   * Verify connection to Contentful
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { spaceId, accessToken, environment = 'master' } = auth;
      
      if (!spaceId || !accessToken) {
        return {
          ok: false,
          details: 'Missing required credentials: spaceId and accessToken'
        };
      }

      // Test Contentful API access
      const response = await fetch(`https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}/entries?limit=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const data = await response.json();
        return {
          ok: true,
          details: {
            spaceId: spaceId,
            environment: environment,
            totalEntries: data.total,
            spaceName: 'Contentful Space' // Could fetch space details if needed
          }
        };
      } else if (response.status === 401) {
        return {
          ok: false,
          details: 'Invalid access token'
        };
      } else if (response.status === 404) {
        return {
          ok: false,
          details: 'Space not found or access denied'
        };
      } else {
        return {
          ok: false,
          details: `Contentful API error: ${response.status}`
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
   * List posts from Contentful
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { spaceId, accessToken, environment = 'master' } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Fetch blog posts from Contentful
      const response = await fetch(
        `https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}/entries?content_type=blogPost&limit=${limit}&skip=${skip}&include=2`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Contentful entries to our format
      const posts = data.items.map(entry => {
        const fields = entry.fields;
        const featuredImage = fields.featuredImage && data.includes.Asset 
          ? data.includes.Asset.find(asset => asset.sys.id === fields.featuredImage.sys.id)
          : null;

        return {
          id: entry.sys.id,
          title: fields.title || '',
          content: fields.content || '',
          excerpt: fields.excerpt || '',
          status: entry.sys.publishedVersion ? 'published' : 'draft',
          date: fields.publishDate || entry.sys.createdAt,
          modified: entry.sys.updatedAt,
          slug: fields.slug || '',
          link: fields.slug ? `https://yourdomain.com/blog/${fields.slug}` : '',
          featuredImage: featuredImage ? {
            url: featuredImage.fields.file.url,
            alt: featuredImage.fields.description || ''
          } : null,
          categories: fields.categories || [],
          tags: fields.tags || [],
          author: fields.author || '',
          scheduledAt: fields.scheduledAt || null,
          metadata: {
            contentType: entry.sys.contentType.sys.id,
            version: entry.sys.version,
            publishedVersion: entry.sys.publishedVersion
          }
        };
      });

      return posts;
    } catch (error) {
      console.error('Failed to list Contentful posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Contentful
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { spaceId, accessToken, environment = 'master' } = auth;
      
      // Prepare the entry data
      const entryData = {
        fields: {
          title: {
            'en-US': input.title
          },
          content: {
            'en-US': input.content
          },
          slug: {
            'en-US': this._generateSlug(input.title)
          }
        }
      };

      // Add optional fields
      if (input.excerpt) {
        entryData.fields.excerpt = { 'en-US': input.excerpt };
      }

      if (input.tags && input.tags.length > 0) {
        entryData.fields.tags = { 'en-US': input.tags };
      }

      if (input.categories && input.categories.length > 0) {
        entryData.fields.categories = { 'en-US': input.categories };
      }

      if (input.featuredImage) {
        entryData.fields.featuredImage = { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id: input.featuredImage } } };
      }

      if (input.scheduledAt) {
        entryData.fields.scheduledAt = { 'en-US': input.scheduledAt.toISOString() };
      }

      // Create the entry
      const response = await fetch(
        `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.contentful.management.v1+json',
            'X-Contentful-Content-Type': 'blogPost'
          },
          body: JSON.stringify(entryData)
        }
      );

      if (response.status === 201) {
        const result = await response.json();
        
        // Publish the entry if no scheduling
        if (!input.scheduledAt) {
          await this._publishEntry(auth, result.sys.id);
        }

        return {
          success: true,
          postId: result.sys.id,
          externalId: result.sys.id,
          url: `https://yourdomain.com/blog/${result.fields.slug['en-US']}`,
          message: 'Post created successfully on Contentful',
          metadata: {
            contentType: result.sys.contentType.sys.id,
            version: result.sys.version,
            publishedVersion: result.sys.publishedVersion
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to create post',
          message: `Contentful API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to create Contentful post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Contentful
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Contentful entry ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { spaceId, accessToken, environment = 'master' } = auth;
      
      // First, get the current entry
      const getResponse = await fetch(
        `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.contentful.management.v1+json'
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

      const currentEntry = await getResponse.json();
      
      // Prepare updated fields
      const updatedFields = { ...currentEntry.fields };
      
      if (input.title) {
        updatedFields.title = { 'en-US': input.title };
      }
      
      if (input.content) {
        updatedFields.content = { 'en-US': input.content };
      }
      
      if (input.excerpt !== undefined) {
        updatedFields.excerpt = { 'en-US': input.excerpt };
      }
      
      if (input.tags) {
        updatedFields.tags = { 'en-US': input.tags };
      }
      
      if (input.categories) {
        updatedFields.categories = { 'en-US': input.categories };
      }
      
      if (input.featuredImage) {
        updatedFields.featuredImage = { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id: input.featuredImage } } };
      }
      
      if (input.scheduledAt) {
        updatedFields.scheduledAt = { 'en-US': input.scheduledAt.toISOString() };
      }

      // Update the entry
      const updateResponse = await fetch(
        `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${postId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.contentful.management.v1+json',
            'X-Contentful-Version': currentEntry.sys.version
          },
          body: JSON.stringify({
            ...currentEntry,
            fields: updatedFields
          })
        }
      );

      if (updateResponse.status === 200) {
        const result = await updateResponse.json();
        
        // Publish if no scheduling
        if (!input.scheduledAt) {
          await this._publishEntry(auth, postId);
        }

        return {
          success: true,
          postId: result.sys.id,
          externalId: result.sys.id,
          url: `https://yourdomain.com/blog/${result.fields.slug['en-US']}`,
          message: 'Post updated successfully on Contentful',
          metadata: {
            contentType: result.sys.contentType.sys.id,
            version: result.sys.version,
            publishedVersion: result.sys.publishedVersion
          }
        };
      } else {
        const error = await updateResponse.json();
        return {
          success: false,
          error: error.message || 'Failed to update post',
          message: `Contentful API error: ${updateResponse.status}`
        };
      }
    } catch (error) {
      console.error('Failed to update Contentful post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Contentful
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Contentful entry ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { spaceId, accessToken, environment = 'master' } = auth;
      
      // First, unpublish the entry if it's published
      try {
        await this._unpublishEntry(auth, postId);
      } catch (error) {
        // Entry might not be published, continue with deletion
      }

      // Delete the entry
      const response = await fetch(
        `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${postId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.contentful.management.v1+json'
          }
        }
      );

      if (response.status === 204) {
        return {
          ok: true,
          message: 'Post deleted successfully from Contentful'
        };
      } else {
        const error = await response.json();
        return {
          ok: false,
          message: `Failed to delete post: ${error.message || response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to delete Contentful post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Contentful
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { spaceId, accessToken, environment = 'master' } = auth;
      
      // First, create the asset
      const assetData = {
        fields: {
          title: {
            'en-US': filename
          },
          description: {
            'en-US': `Image: ${filename}`
          },
          file: {
            'en-US': {
              contentType: this._getMimeType(filename),
              fileName: filename,
              upload: `data:${this._getMimeType(filename)};base64,${fileBuffer.toString('base64')}`
            }
          }
        }
      };

      const createResponse = await fetch(
        `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/assets`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.contentful.management.v1+json'
          },
          body: JSON.stringify(assetData)
        }
      );

      if (createResponse.status !== 201) {
        const error = await createResponse.json();
        throw new Error(error.message || 'Failed to create asset');
      }

      const asset = await createResponse.json();
      
      // Process the asset
      await this._processAsset(auth, asset.sys.id);
      
      // Publish the asset
      await this._publishAsset(auth, asset.sys.id);

      return {
        url: asset.fields.file['en-US'].url,
        id: asset.sys.id
      };
    } catch (error) {
      console.error('Failed to upload image to Contentful:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Helper method to publish an entry
   * @param {object} auth - Authentication credentials
   * @param {string} entryId - Entry ID to publish
   */
  async _publishEntry(auth, entryId) {
    const { spaceId, accessToken, environment = 'master' } = auth;
    
    await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${entryId}/published`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json'
        }
      }
    );
  }

  /**
   * Helper method to unpublish an entry
   * @param {object} auth - Authentication credentials
   * @param {string} entryId - Entry ID to unpublish
   */
  async _unpublishEntry(auth, entryId) {
    const { spaceId, accessToken, environment = 'master' } = auth;
    
    await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${entryId}/published`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json'
        }
      }
    );
  }

  /**
   * Helper method to process an asset
   * @param {object} auth - Authentication credentials
   * @param {string} assetId - Asset ID to process
   */
  async _processAsset(auth, assetId) {
    const { spaceId, accessToken, environment = 'master' } = auth;
    
    await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/assets/${assetId}/files/en-US/process`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json'
        }
      }
    );
  }

  /**
   * Helper method to publish an asset
   * @param {object} auth - Authentication credentials
   * @param {string} assetId - Asset ID to publish
   */
  async _publishAsset(auth, assetId) {
    const { spaceId, accessToken, environment = 'master' } = auth;
    
    await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/assets/${assetId}/published`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json'
        }
      }
    );
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

module.exports = new ContentfulAdapter();