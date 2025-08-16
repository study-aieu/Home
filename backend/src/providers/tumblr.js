const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class TumblrAdapter {
  constructor() {
    this.name = 'Tumblr';
    this.slug = 'tumblr';
    this.description = 'Tumblr microblogging and social networking platform';
    this.category = 'blogging-platform';
    this.authType = 'oauth';
    this.features = {
      images: true,
      tags: true,
      scheduling: true,
      edit: true,
      delete: true,
      categories: false, // Tumblr uses tags instead
      excerpts: true,
      featuredImages: true,
      customFields: false
    };
    this.website = 'https://www.tumblr.com';
    this.apiDocs = 'https://www.tumblr.com/docs/en/api/v2';
  }

  async verifyConnection(connection) {
    try {
      const { accessToken, blogIdentifier } = connection.credentials;
      
      if (!accessToken || !blogIdentifier) {
        throw new Error('Missing required credentials: accessToken and blogIdentifier');
      }

      // Test the connection by fetching blog info
      const response = await fetch(`https://api.tumblr.com/v2/blog/${blogIdentifier}/info`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Tumblr API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        valid: true,
        blogInfo: data.response.blog,
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
      const { accessToken, blogIdentifier } = connection.credentials;
      const { limit = 20, offset = 0, type = 'text' } = options;

      const response = await fetch(
        `https://api.tumblr.com/v2/blog/${blogIdentifier}/posts?type=${type}&limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Tumblr API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const posts = data.response.posts.map(post => this._transformPost(post));

      return {
        posts,
        total: posts.length,
        hasMore: posts.length === limit
      };
    } catch (error) {
      throw new Error(`Failed to list Tumblr posts: ${error.message}`);
    }
  }

  async createPost(connection, postData) {
    try {
      const { accessToken, blogIdentifier } = connection.credentials;
      const { title, content, tags = [], state = 'published', publishOn } = postData;

      // Prepare the post data for Tumblr
      const tumblrPost = {
        type: 'text',
        title: title,
        body: content,
        tags: tags.join(','),
        state: state === 'published' ? 'published' : 'draft'
      };

      // Add scheduling if specified
      if (publishOn && state === 'scheduled') {
        tumblrPost.publish_on = new Date(publishOn).toISOString();
      }

      const response = await fetch(`https://api.tumblr.com/v2/blog/${blogIdentifier}/post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tumblrPost)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Tumblr API error: ${response.status} ${response.statusText} - ${errorData.meta?.msg || 'Unknown error'}`);
      }

      const data = await response.json();
      return {
        id: data.response.id.toString(),
        url: data.response.url,
        message: 'Post created successfully on Tumblr'
      };
    } catch (error) {
      throw new Error(`Failed to create Tumblr post: ${error.message}`);
    }
  }

  async updatePost(connection, postId, postData) {
    try {
      const { accessToken, blogIdentifier } = connection.credentials;
      const { title, content, tags = [], state = 'published', publishOn } = postData;

      // Prepare the update data
      const updateData = {
        type: 'text',
        title: title,
        body: content,
        tags: tags.join(',')
      };

      // Add scheduling if specified
      if (publishOn && state === 'scheduled') {
        updateData.publish_on = new Date(publishOn).toISOString();
      }

      const response = await fetch(`https://api.tumblr.com/v2/blog/${blogIdentifier}/post/edit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: postId,
          ...updateData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Tumblr API error: ${response.status} ${response.statusText} - ${errorData.meta?.msg || 'Unknown error'}`);
      }

      return {
        id: postId,
        message: 'Post updated successfully on Tumblr'
      };
    } catch (error) {
      throw new Error(`Failed to update Tumblr post: ${error.message}`);
    }
  }

  async deletePost(connection, postId) {
    try {
      const { accessToken, blogIdentifier } = connection.credentials;

      const response = await fetch(`https://api.tumblr.com/v2/blog/${blogIdentifier}/post/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: postId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Tumblr API error: ${response.status} ${response.statusText} - ${errorData.meta?.msg || 'Unknown error'}`);
      }

      return {
        id: postId,
        message: 'Post deleted successfully from Tumblr'
      };
    } catch (error) {
      throw new Error(`Failed to delete Tumblr post: ${error.message}`);
    }
  }

  async uploadImage(connection, imageBuffer, filename) {
    try {
      const { accessToken, blogIdentifier } = connection.credentials;
      
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      const response = await fetch(`https://api.tumblr.com/v2/blog/${blogIdentifier}/post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'photo',
          data: base64Image,
          caption: filename
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Tumblr API error: ${response.status} ${response.statusText} - ${errorData.meta?.msg || 'Unknown error'}`);
      }

      const data = await response.json();
      
      return {
        id: data.response.id.toString(),
        url: data.response.url,
        imageUrl: data.response.photos?.[0]?.original_size?.url || null,
        message: 'Image uploaded successfully to Tumblr'
      };
    } catch (error) {
      throw new Error(`Failed to upload image to Tumblr: ${error.message}`);
    }
  }

  // Helper method to transform Tumblr post data to our standard format
  _transformPost(tumblrPost) {
    return {
      id: tumblrPost.id.toString(),
      title: tumblrPost.title || tumblrPost.summary || 'Untitled',
      content: tumblrPost.body || tumblrPost.caption || '',
      excerpt: tumblrPost.summary || '',
      tags: tumblrPost.tags || [],
      url: tumblrPost.post_url,
      state: tumblrPost.state || 'published',
      publishedAt: tumblrPost.date ? new Date(tumblrPost.date) : null,
      createdAt: tumblrPost.timestamp ? new Date(tumblrPost.timestamp * 1000) : null,
      updatedAt: tumblrPost.timestamp ? new Date(tumblrPost.timestamp * 1000) : null,
      featuredImage: tumblrPost.photos?.[0]?.original_size?.url || null,
      customFields: {
        type: tumblrPost.type,
        reblogKey: tumblrPost.reblog_key,
        noteCount: tumblrPost.note_count,
        reblogCount: tumblrPost.reblog_count
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
}

module.exports = TumblrAdapter;