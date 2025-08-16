const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class LinkedInAdapter {
  constructor() {
    this.name = 'LinkedIn';
    this.slug = 'linkedin';
    this.description = 'LinkedIn professional networking and content platform';
    this.category = 'social-platform';
    this.authType = 'oauth';
    this.features = {
      images: true,
      tags: false, // LinkedIn uses hashtags in content
      scheduling: true,
      edit: false, // LinkedIn posts cannot be edited after publishing
      delete: true,
      categories: false,
      excerpts: false, // LinkedIn doesn't have separate excerpts
      featuredImages: true,
      customFields: false
    };
    this.website = 'https://www.linkedin.com';
    this.apiDocs = 'https://developer.linkedin.com/docs';
  }

  async verifyConnection(connection) {
    try {
      const { accessToken, profileId } = connection.credentials;
      
      if (!accessToken || !profileId) {
        throw new Error('Missing required credentials: accessToken and profileId');
      }

      // Test the connection by fetching profile info
      const response = await fetch(`https://api.linkedin.com/v2/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        valid: true,
        profileInfo: data,
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
      const { accessToken, profileId } = connection.credentials;
      const { limit = 20, offset = 0 } = options;

      // LinkedIn API doesn't provide a direct way to list posts via API
      // This is a limitation of the LinkedIn API
      // We'll return a placeholder response
      return {
        posts: [],
        total: 0,
        hasMore: false,
        message: 'LinkedIn API does not support listing posts. Posts can only be created and deleted.'
      };
    } catch (error) {
      throw new Error(`Failed to list LinkedIn posts: ${error.message}`);
    }
  }

  async createPost(connection, postData) {
    try {
      const { accessToken, profileId } = connection.credentials;
      const { title, content, featuredImage, state = 'published', publishOn } = postData;

      // LinkedIn posts are always published immediately
      // Scheduling is handled by the LinkedIn platform itself
      
      // Prepare the post data for LinkedIn
      const linkedinPost = {
        author: `urn:li:person:${profileId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: featuredImage ? 'IMAGE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Add image if provided
      if (featuredImage) {
        // First, register the image upload
        const imageRegisterResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: `urn:li:person:${profileId}`,
              serviceRelationships: [
                {
                  relationshipType: 'OWNER',
                  identifier: 'urn:li:userGeneratedContent'
                }
              ]
            }
          })
        });

        if (!imageRegisterResponse.ok) {
          throw new Error(`Failed to register image upload: ${imageRegisterResponse.statusText}`);
        }

        const imageRegisterData = await imageRegisterResponse.json();
        const uploadUrl = imageRegisterData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const asset = imageRegisterData.value.asset;

        // Upload the image
        const imageUploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream'
          },
          body: Buffer.from(featuredImage, 'base64')
        });

        if (!imageUploadResponse.ok) {
          throw new Error(`Failed to upload image: ${imageUploadResponse.statusText}`);
        }

        // Add the image to the post
        linkedinPost.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
        linkedinPost.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            description: {
              text: title || 'Image'
            },
            media: asset,
            title: {
              text: title || 'Post'
            }
          }
        ];
      }

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(linkedinPost)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`LinkedIn API error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        url: `https://www.linkedin.com/feed/update/${data.id}/`,
        message: 'Post created successfully on LinkedIn'
      };
    } catch (error) {
      throw new Error(`Failed to create LinkedIn post: ${error.message}`);
    }
  }

  async updatePost(connection, postId, postData) {
    // LinkedIn posts cannot be edited after publishing
    throw new Error('LinkedIn posts cannot be edited after publishing. Please delete and recreate the post.');
  }

  async deletePost(connection, postId) {
    try {
      const { accessToken } = connection.credentials;

      const response = await fetch(`https://api.linkedin.com/v2/ugcPosts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`LinkedIn API error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      return {
        id: postId,
        message: 'Post deleted successfully from LinkedIn'
      };
    } catch (error) {
      throw new Error(`Failed to delete LinkedIn post: ${error.message}`);
    }
  }

  async uploadImage(connection, imageBuffer, filename) {
    try {
      const { accessToken, profileId } = connection.credentials;
      
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Register the image upload
      const imageRegisterResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${profileId}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent'
              }
            ]
          }
        })
      });

      if (!imageRegisterResponse.ok) {
        throw new Error(`Failed to register image upload: ${imageRegisterResponse.statusText}`);
      }

      const imageRegisterData = await imageRegisterResponse.json();
      const uploadUrl = imageRegisterData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = imageRegisterData.value.asset;

      // Upload the image
      const imageUploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream'
        },
        body: Buffer.from(base64Image, 'base64')
      });

      if (!imageUploadResponse.ok) {
        throw new Error(`Failed to upload image: ${imageUploadResponse.statusText}`);
      }

      return {
        id: asset,
        url: `https://www.linkedin.com/feed/update/${asset}/`,
        imageUrl: asset, // LinkedIn returns the asset URN
        message: 'Image uploaded successfully to LinkedIn'
      };
    } catch (error) {
      throw new Error(`Failed to upload image to LinkedIn: ${error.message}`);
    }
  }

  // Helper method to transform LinkedIn post data to our standard format
  _transformPost(linkedinPost) {
    return {
      id: linkedinPost.id,
      title: 'LinkedIn Post', // LinkedIn doesn't have titles
      content: linkedinPost.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '',
      excerpt: '',
      tags: [],
      url: `https://www.linkedin.com/feed/update/${linkedinPost.id}/`,
      state: 'published', // LinkedIn posts are always published
      publishedAt: linkedinPost.created?.time ? new Date(linkedinPost.created.time) : null,
      createdAt: linkedinPost.created?.time ? new Date(linkedinPost.created.time) : null,
      updatedAt: linkedinPost.lastModified?.time ? new Date(linkedinPost.lastModified.time) : null,
      featuredImage: null,
      customFields: {
        lifecycleState: linkedinPost.lifecycleState,
        visibility: linkedinPost.visibility?.['com.linkedin.ugc.MemberNetworkVisibility'],
        mediaCategory: linkedinPost.specificContent?.['com.linkedin.ugc.ShareContent']?.shareMediaCategory
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

  // Helper method to get profile information
  async getProfile(connection) {
    try {
      const { accessToken } = connection.credentials;

      const response = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Failed to get LinkedIn profile: ${error.message}`);
    }
  }
}

module.exports = LinkedInAdapter;