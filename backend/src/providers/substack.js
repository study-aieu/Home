const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class SubstackAdapter {
  constructor() {
    this.name = 'Substack';
    this.slug = 'substack';
    this.description = 'Substack newsletter and publishing platform';
    this.category = 'newsletter-platform';
    this.authType = 'oauth';
    this.features = {
      images: true,
      tags: false, // Substack uses sections instead
      scheduling: true,
      edit: true,
      delete: true,
      categories: true, // Called "sections" in Substack
      excerpts: true,
      featuredImages: true,
      customFields: false
    };
    this.website = 'https://substack.com';
    this.apiDocs = 'https://substack.com/api';
  }

  async verifyConnection(connection) {
    try {
      const { accessToken, publicationId } = connection.credentials;
      
      if (!accessToken || !publicationId) {
        throw new Error('Missing required credentials: accessToken and publicationId');
      }

      // Test the connection by fetching publication info
      const response = await fetch(`https://substack.com/api/v1/publication/${publicationId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        valid: true,
        publicationInfo: data,
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
      const { accessToken, publicationId } = connection.credentials;
      const { limit = 20, offset = 0, section = null } = options;

      let url = `https://substack.com/api/v1/publication/${publicationId}/posts?limit=${limit}&offset=${offset}`;
      if (section) {
        url += `&section=${encodeURIComponent(section)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const posts = data.posts.map(post => this._transformPost(post));

      return {
        posts,
        total: posts.length,
        hasMore: posts.length === limit
      };
    } catch (error) {
      throw new Error(`Failed to list Substack posts: ${error.message}`);
    }
  }

  async createPost(connection, postData) {
    try {
      const { accessToken, publicationId } = connection.credentials;
      const { title, content, excerpt, section, state = 'draft', publishOn, featuredImage } = postData;

      // Prepare the post data for Substack
      const substackPost = {
        title: title,
        subtitle: excerpt || '',
        body: content,
        section: section || 'general',
        is_draft: state !== 'published',
        scheduled_for: publishOn ? new Date(publishOn).toISOString() : null
      };

      // Add featured image if provided
      if (featuredImage) {
        substackPost.featured_image = featuredImage;
      }

      const response = await fetch(`https://substack.com/api/v1/publication/${publicationId}/post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(substackPost)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Substack API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      return {
        id: data.post.id.toString(),
        url: data.post.url,
        message: 'Post created successfully on Substack'
      };
    } catch (error) {
      throw new Error(`Failed to create Substack post: ${error.message}`);
    }
  }

  async updatePost(connection, postId, postData) {
    try {
      const { accessToken, publicationId } = connection.credentials;
      const { title, content, excerpt, section, state = 'draft', publishOn, featuredImage } = postData;

      // Prepare the update data
      const updateData = {
        title: title,
        subtitle: excerpt || '',
        body: content,
        section: section || 'general',
        is_draft: state !== 'published'
      };

      // Add scheduling if specified
      if (publishOn && state === 'scheduled') {
        updateData.scheduled_for = new Date(publishOn).toISOString();
      }

      // Add featured image if provided
      if (featuredImage) {
        updateData.featured_image = featuredImage;
      }

      const response = await fetch(`https://substack.com/api/v1/publication/${publicationId}/post/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Substack API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      return {
        id: postId,
        message: 'Post updated successfully on Substack'
      };
    } catch (error) {
      throw new Error(`Failed to update Substack post: ${error.message}`);
    }
  }

  async deletePost(connection, postId) {
    try {
      const { accessToken, publicationId } = connection.credentials;

      const response = await fetch(`https://substack.com/api/v1/publication/${publicationId}/post/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Substack API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      return {
        id: postId,
        message: 'Post deleted successfully from Substack'
      };
    } catch (error) {
      throw new Error(`Failed to delete Substack post: ${error.message}`);
    }
  }

  async uploadImage(connection, imageBuffer, filename) {
    try {
      const { accessToken, publicationId } = connection.credentials;
      
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      const response = await fetch(`https://substack.com/api/v1/publication/${publicationId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: base64Image,
          filename: filename,
          type: 'image'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Substack API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      return {
        id: data.upload.id.toString(),
        url: data.upload.url,
        imageUrl: data.upload.url,
        message: 'Image uploaded successfully to Substack'
      };
    } catch (error) {
      throw new Error(`Failed to upload image to Substack: ${error.message}`);
    }
  }

  // Helper method to transform Substack post data to our standard format
  _transformPost(substackPost) {
    return {
      id: substackPost.id.toString(),
      title: substackPost.title || 'Untitled',
      content: substackPost.body || '',
      excerpt: substackPost.subtitle || '',
      tags: [], // Substack doesn't use tags
      url: substackPost.url,
      state: substackPost.is_draft ? 'draft' : 'published',
      publishedAt: substackPost.published_at ? new Date(substackPost.published_at) : null,
      createdAt: substackPost.created_at ? new Date(substackPost.created_at) : null,
      updatedAt: substackPost.updated_at ? new Date(substackPost.updated_at) : null,
      featuredImage: substackPost.featured_image || null,
      categories: substackPost.section ? [substackPost.section] : [],
      customFields: {
        type: 'newsletter',
        is_draft: substackPost.is_draft,
        scheduled_for: substackPost.scheduled_for,
        view_count: substackPost.view_count,
        comment_count: substackPost.comment_count
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

  // Helper method to get available sections
  async getSections(connection) {
    try {
      const { accessToken, publicationId } = connection.credentials;

      const response = await fetch(`https://substack.com/api/v1/publication/${publicationId}/sections`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Substack API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.sections || [];
    } catch (error) {
      throw new Error(`Failed to get Substack sections: ${error.message}`);
    }
  }
}

module.exports = SubstackAdapter;