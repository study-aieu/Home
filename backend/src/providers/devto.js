const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class DevToAdapter {
  constructor() {
    this.name = 'Dev.to';
    this.slug = 'devto';
    this.description = 'Dev.to developer community and blogging platform';
    this.category = 'developer-platform';
    this.authType = 'api-key';
    this.features = {
      images: true,
      tags: true,
      scheduling: true,
      edit: true,
      delete: true,
      categories: false, // Dev.to uses tags instead
      excerpts: true,
      featuredImages: true,
      customFields: true
    };
    this.website = 'https://dev.to';
    this.apiDocs = 'https://docs.dev.to/api';
  }

  async verifyConnection(connection) {
    try {
      const { apiKey } = connection.credentials;
      
      if (!apiKey) {
        throw new Error('Missing required credentials: apiKey');
      }

      // Test the connection by fetching user info
      const response = await fetch('https://dev.to/api/users/me', {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Dev.to API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        valid: true,
        userInfo: data,
        message: 'Connection verified successfully'
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async listPosts(connection, options = {}) {
    try {
      const { apiKey } = connection.credentials;
      const { limit = 20, offset = 0, state = 'published' } = options;

      let url = `https://dev.to/api/articles/me?per_page=${limit}&page=${Math.floor(offset / limit) + 1}`;
      
      // Filter by state if specified
      if (state === 'draft') {
        url += '&state=draft';
      }

      const response = await fetch(url, {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Dev.to API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const posts = data.map(post => this._transformPost(post));

      return {
        posts,
        total: posts.length,
        hasMore: posts.length === limit
      };
    } catch (error) {
      throw new Error(`Failed to list Dev.to posts: ${error.message}`);
    }
  }

  async createPost(connection, postData) {
    try {
      const { apiKey } = connection.credentials;
      const { title, content, excerpt, tags = [], state = 'draft', publishOn, featuredImage, series, canonicalUrl } = postData;

      // Prepare the post data for Dev.to
      const devToPost = {
        article: {
          title: title,
          body_markdown: content,
          description: excerpt || '',
          tags: tags,
          published: state === 'published',
          series: series || undefined,
          canonical_url: canonicalUrl || undefined
        }
      };

      // Add featured image if provided
      if (featuredImage) {
        devToPost.article.cover_image = featuredImage;
      }

      // Add scheduling if specified
      if (publishOn && state === 'scheduled') {
        devToPost.article.published_at = new Date(publishOn).toISOString();
      }

      const response = await fetch('https://dev.to/api/articles', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(devToPost)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Dev.to API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      return {
        id: data.id.toString(),
        url: data.url,
        message: 'Post created successfully on Dev.to'
      };
    } catch (error) {
      throw new Error(`Failed to create Dev.to post: ${error.message}`);
    }
  }

  async updatePost(connection, postId, postData) {
    try {
      const { apiKey } = connection.credentials;
      const { title, content, excerpt, tags = [], state = 'published', publishOn, featuredImage, series, canonicalUrl } = postData;

      // Prepare the update data
      const updateData = {
        article: {
          title: title,
          body_markdown: content,
          description: excerpt || '',
          tags: tags,
          published: state === 'published'
        }
      };

      // Add featured image if provided
      if (featuredImage) {
        updateData.article.cover_image = featuredImage;
      }

      // Add series if provided
      if (series) {
        updateData.article.series = series;
      }

      // Add canonical URL if provided
      if (canonicalUrl) {
        updateData.article.canonical_url = canonicalUrl;
      }

      // Add scheduling if specified
      if (publishOn && state === 'scheduled') {
        updateData.article.published_at = new Date(publishOn).toISOString();
      }

      const response = await fetch(`https://dev.to/api/articles/${postId}`, {
        method: 'PUT',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Dev.to API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      return {
        id: postId,
        message: 'Post updated successfully on Dev.to'
      };
    } catch (error) {
      throw new Error(`Failed to update Dev.to post: ${error.message}`);
    }
  }

  async deletePost(connection, postId) {
    try {
      const { apiKey } = connection.credentials;

      const response = await fetch(`https://dev.to/api/articles/${postId}`, {
        method: 'DELETE',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Dev.to API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      return {
        id: postId,
        message: 'Post deleted successfully from Dev.to'
      };
    } catch (error) {
      throw new Error(`Failed to delete Dev.to post: ${error.message}`);
    }
  }

  async uploadImage(connection, imageBuffer, filename) {
    try {
      const { apiKey } = connection.credentials;
      
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      const response = await fetch('https://dev.to/api/image_uploads', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Image
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Dev.to API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      return {
        id: Date.now().toString(), // Dev.to doesn't return an ID for uploads
        url: data.url,
        imageUrl: data.url,
        message: 'Image uploaded successfully to Dev.to'
      };
    } catch (error) {
      throw new Error(`Failed to upload image to Dev.to: ${error.message}`);
    }
  }

  // Helper method to transform Dev.to post data to our standard format
  _transformPost(devToPost) {
    return {
      id: devToPost.id.toString(),
      title: devToPost.title || 'Untitled',
      content: devToPost.body_markdown || '',
      excerpt: devToPost.description || '',
      tags: devToPost.tags || [],
      url: devToPost.url,
      state: devToPost.published ? 'published' : 'draft',
      publishedAt: devToPost.published_at ? new Date(devToPost.published_at) : null,
      createdAt: devToPost.created_at ? new Date(devToPost.created_at) : null,
      updatedAt: devToPost.edited_at ? new Date(devToPost.edited_at) : null,
      featuredImage: devToPost.cover_image || null,
      customFields: {
        slug: devToPost.slug,
        reading_time: devToPost.reading_time_minutes,
        comments_count: devToPost.comments_count,
        public_reactions_count: devToPost.public_reactions_count,
        series: devToPost.series,
        canonical_url: devToPost.canonical_url,
        organization: devToPost.organization
      }
    };
  }

  // Helper method to generate a slug from title
  _generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Helper method to get available tags
  async getTags(connection) {
    try {
      const { apiKey } = connection.credentials;

      const response = await fetch('https://dev.to/api/tags', {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Dev.to API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Failed to get Dev.to tags: ${error.message}`);
    }
  }

  // Helper method to get user's organizations
  async getOrganizations(connection) {
    try {
      const { apiKey } = connection.credentials;

      const response = await fetch('https://dev.to/api/organizations/users', {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Dev.to API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Failed to get Dev.to organizations: ${error.message}`);
    }
  }
}

module.exports = DevToAdapter;