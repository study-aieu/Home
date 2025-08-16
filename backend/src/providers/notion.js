/**
 * Notion Provider Adapter
 * 
 * Supports publishing to Notion as a blog
 * Implements the CMSAdapter interface
 */

class NotionAdapter {
  constructor() {
    this.id = 'notion';
    this.name = 'Notion';
    this.category = 'collaboration';
    
    // Define supported features
    this.supports = {
      images: true,
      tags: true,
      scheduling: false, // Notion doesn't support scheduling
      edit: true,
      delete: true,
      categories: true,
      excerpts: true,
      featuredImages: true,
      customFields: true
    };
  }

  /**
   * Verify connection to Notion
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { accessToken, databaseId } = auth;
      
      if (!accessToken || !databaseId) {
        return {
          ok: false,
          details: 'Missing required credentials: accessToken and databaseId'
        };
      }

      // Test Notion API access by fetching database info
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const database = await response.json();
        return {
          ok: true,
          details: {
            databaseId: databaseId,
            databaseName: database.title[0]?.plain_text || 'Untitled',
            databaseUrl: database.url,
            properties: Object.keys(database.properties)
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
          details: 'Database not found or access denied'
        };
      } else {
        return {
          ok: false,
          details: `Notion API error: ${response.status}`
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
   * List posts from Notion
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { accessToken, databaseId } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // Calculate start cursor for pagination
      const startCursor = opts.startCursor || undefined;

      // Fetch pages from Notion database
      const response = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            page_size: limit,
            start_cursor: startCursor,
            sorts: [
              {
                property: 'Created time',
                direction: 'descending'
              }
            ]
          })
        }
      );

      if (response.status !== 200) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Notion pages to our format
      const posts = data.results.map(page => {
        const properties = page.properties;
        
        return {
          id: page.id,
          title: this._extractText(properties.Title || properties.Name),
          content: this._extractText(properties.Content),
          excerpt: this._extractText(properties.Excerpt),
          status: page.published ? 'published' : 'draft',
          date: page.created_time,
          modified: page.last_edited_time,
          slug: this._extractText(properties.Slug),
          link: page.url,
          featuredImage: properties.FeaturedImage?.files?.[0] ? {
            url: properties.FeaturedImage.files[0].file?.url || properties.FeaturedImage.files[0].external?.url,
            alt: this._extractText(properties.FeaturedImageAlt) || ''
          } : null,
          categories: this._extractMultiSelect(properties.Categories),
          tags: this._extractMultiSelect(properties.Tags),
          author: this._extractText(properties.Author),
          scheduledAt: null, // Notion doesn't support scheduling
          metadata: {
            notionId: page.id,
            notionUrl: page.url,
            hasChildren: page.has_children
          }
        };
      });

      return posts;
    } catch (error) {
      console.error('Failed to list Notion posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Notion
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { accessToken, databaseId } = auth;
      
      // Prepare the page properties
      const properties = {
        Title: {
          title: [
            {
              text: {
                content: input.title
              }
            }
          ]
        },
        Content: {
          rich_text: [
            {
              text: {
                content: input.content
              }
            }
          ]
        }
      };

      // Add optional properties
      if (input.excerpt) {
        properties.Excerpt = {
          rich_text: [
            {
              text: {
                content: input.excerpt
              }
            }
          ]
        };
      }

      if (input.slug) {
        properties.Slug = {
          rich_text: [
            {
              text: {
                content: input.slug
              }
            }
          ]
        };
      }

      if (input.tags && input.tags.length > 0) {
        properties.Tags = {
          multi_select: input.tags.map(tag => ({ name: tag }))
        };
      }

      if (input.categories && input.categories.length > 0) {
        properties.Categories = {
          multi_select: input.categories.map(category => ({ name: category }))
        };
      }

      if (input.author) {
        properties.Author = {
          rich_text: [
            {
              text: {
                content: input.author
              }
            }
          ]
        };
      }

      if (input.featuredImage) {
        properties.FeaturedImage = {
          files: [
            {
              name: 'Featured Image',
              type: 'external',
              external: {
                url: input.featuredImage
              }
            }
          ]
        };
      }

      // Create the page
      const response = await fetch(
        'https://api.notion.com/v1/pages',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent: {
              database_id: databaseId
            },
            properties: properties
          })
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        
        return {
          success: true,
          postId: result.id,
          externalId: result.id,
          url: result.url,
          message: 'Post created successfully on Notion',
          metadata: {
            notionId: result.id,
            notionUrl: result.url,
            hasChildren: result.has_children
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to create post',
          message: `Notion API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to create Notion post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Notion
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Notion page ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { accessToken, databaseId } = auth;
      
      // Prepare updated properties
      const properties = {};

      if (input.title) {
        properties.Title = {
          title: [
            {
              text: {
                content: input.title
              }
            }
          ]
        };
      }
      
      if (input.content) {
        properties.Content = {
          rich_text: [
            {
              text: {
                content: input.content
              }
            }
          ]
        };
      }
      
      if (input.excerpt !== undefined) {
        properties.Excerpt = {
          rich_text: [
            {
              text: {
                content: input.excerpt
              }
            }
          ]
        };
      }
      
      if (input.slug) {
        properties.Slug = {
          rich_text: [
            {
              text: {
                content: input.slug
              }
            }
          ]
        };
      }
      
      if (input.tags) {
        properties.Tags = {
          multi_select: input.tags.map(tag => ({ name: tag }))
        };
      }
      
      if (input.categories) {
        properties.Categories = {
          multi_select: input.categories.map(category => ({ name: category }))
        };
      }
      
      if (input.author) {
        properties.Author = {
          rich_text: [
            {
              text: {
                content: input.author
              }
            }
          ]
        };
      }
      
      if (input.featuredImage) {
        properties.FeaturedImage = {
          files: [
            {
              name: 'Featured Image',
              type: 'external',
              external: {
                url: input.featuredImage
              }
            }
          ]
        };
      }

      // Update the page
      const response = await fetch(
        `https://api.notion.com/v1/pages/${postId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: properties
          })
        }
      );

      if (response.status === 200) {
        const result = await response.json();
        
        return {
          success: true,
          postId: result.id,
          externalId: result.id,
          url: result.url,
          message: 'Post updated successfully on Notion',
          metadata: {
            notionId: result.id,
            notionUrl: result.url,
            hasChildren: result.has_children
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to update post',
          message: `Notion API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to update Notion post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Notion
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Notion page ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { accessToken, databaseId } = auth;
      
      // Archive the page (Notion doesn't support permanent deletion via API)
      const response = await fetch(
        `https://api.notion.com/v1/pages/${postId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            archived: true
          })
        }
      );

      if (response.status === 200) {
        return {
          ok: true,
          message: 'Post archived successfully on Notion'
        };
      } else {
        const error = await response.json();
        return {
          ok: false,
          message: `Failed to archive post: ${error.message || response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to delete Notion post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Notion
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      // Notion doesn't support direct file uploads via API
      // Images must be hosted externally and referenced by URL
      throw new Error('Notion does not support direct image uploads. Please host images externally and provide URLs.');
    } catch (error) {
      console.error('Failed to upload image to Notion:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Helper method to extract text from Notion rich text
   * @param {object} property - Notion property
   * @returns {string} Extracted text
   */
  _extractText(property) {
    if (!property) return '';
    
    if (property.type === 'title') {
      return property.title?.map(item => item.plain_text).join('') || '';
    }
    
    if (property.type === 'rich_text') {
      return property.rich_text?.map(item => item.plain_text).join('') || '';
    }
    
    return '';
  }

  /**
   * Helper method to extract multi-select values
   * @param {object} property - Notion property
   * @returns {Array} Extracted values
   */
  _extractMultiSelect(property) {
    if (!property || property.type !== 'multi_select') return [];
    
    return property.multi_select?.map(item => item.name) || [];
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

module.exports = new NotionAdapter();