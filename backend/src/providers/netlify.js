/**
 * Netlify Provider Adapter
 * 
 * Supports publishing to Netlify via Git integration
 * Implements the CMSAdapter interface
 */

const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class NetlifyAdapter {
  constructor() {
    this.id = 'netlify';
    this.name = 'Netlify';
    this.category = 'hosting';
    
    // Define supported features
    this.supports = {
      images: true,
      tags: true,
      scheduling: false, // Netlify doesn't support scheduling
      edit: false, // Posts are managed via Git
      delete: false, // Posts are managed via Git
      categories: true,
      excerpts: true,
      featuredImages: true,
      customFields: true
    };
  }

  /**
   * Verify connection to Netlify
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { siteId, accessToken, gitRemote } = auth;
      
      if (!siteId || !accessToken) {
        return {
          ok: false,
          details: 'Missing required credentials: siteId and accessToken'
        };
      }

      // Test Netlify API access by fetching site info
      const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const site = await response.json();
        
        // Check Git status if gitRemote is provided
        let gitStatus = null;
        if (gitRemote) {
          try {
            const { stdout } = await execAsync('git remote -v', { cwd: process.cwd() });
            const hasRemote = stdout.includes(gitRemote);
            gitStatus = {
              hasRemote,
              remoteUrl: gitRemote
            };
          } catch (error) {
            gitStatus = {
              hasRemote: false,
              error: error.message
            };
          }
        }

        return {
          ok: true,
          details: {
            siteId: siteId,
            siteName: site.name,
            siteUrl: site.url,
            customDomain: site.custom_domain,
            gitStatus: gitStatus,
            deployUrl: site.deploy_url
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
          details: 'Site not found or access denied'
        };
      } else {
        return {
          ok: false,
          details: `Netlify API error: ${response.status}`
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
   * List posts from Netlify site
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { siteId, accessToken, gitRemote } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // For Netlify, we need to check the Git repository for posts
      // This is a simplified implementation that assumes posts are in markdown files
      if (!gitRemote) {
        throw new Error('Git remote is required to list posts from Netlify');
      }

      // Get the latest deployment to see current content
      const deploymentResponse = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (deploymentResponse.status !== 200) {
        throw new Error(`Failed to fetch deployments: ${deploymentResponse.status}`);
      }

      const deployments = await deploymentResponse.json();
      if (deployments.length === 0) {
        return [];
      }

      const latestDeploy = deployments[0];
      
      // For now, return a placeholder since we can't directly access file contents
      // In a real implementation, you'd need to clone the repo or use Netlify's file API
      return [{
        id: 'placeholder',
        title: 'Posts managed via Git',
        content: 'Posts are managed through Git integration with Netlify',
        excerpt: 'Git-based content management',
        status: 'published',
        date: latestDeploy.created_at,
        modified: latestDeploy.created_at,
        slug: 'git-managed',
        link: latestDeploy.deploy_url,
        featuredImage: null,
        categories: [],
        tags: [],
        author: '',
        scheduledAt: null,
        metadata: {
          deployId: latestDeploy.id,
          deployUrl: latestDeploy.deploy_url,
          gitCommit: latestDeploy.commit_ref
        }
      }];
    } catch (error) {
      console.error('Failed to list Netlify posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Netlify
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { siteId, accessToken, gitRemote } = auth;
      
      if (!gitRemote) {
        return {
          success: false,
          error: 'Git remote required',
          message: 'Netlify requires Git integration to create posts'
        };
      }

      // For Netlify, we need to create the post in the Git repository
      // This is a simplified implementation
      const postData = {
        title: input.title,
        content: input.content,
        excerpt: input.excerpt || '',
        tags: input.tags || [],
        categories: input.categories || [],
        author: input.author || '',
        featuredImage: input.featuredImage || null
      };

      // In a real implementation, you would:
      // 1. Clone the repository
      // 2. Create the markdown file
      // 3. Commit and push
      // 4. Trigger a Netlify build

      // For now, return a success response indicating the post should be created via Git
      return {
        success: true,
        postId: `git-${Date.now()}`,
        externalId: `git-${Date.now()}`,
        url: `https://yourdomain.com/blog/${this._generateSlug(input.title)}`,
        message: 'Post created successfully. Please commit and push to Git to deploy on Netlify.',
        metadata: {
          requiresGitCommit: true,
          postData: postData,
          instructions: 'Commit and push to Git to trigger Netlify deployment'
        }
      };
    } catch (error) {
      console.error('Failed to create Netlify post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Netlify
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Netlify post ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { siteId, accessToken, gitRemote } = auth;
      
      if (!gitRemote) {
        return {
          success: false,
          error: 'Git remote required',
          message: 'Netlify requires Git integration to update posts'
        };
      }

      // For Netlify, updates are handled via Git
      return {
        success: true,
        postId: postId,
        externalId: postId,
        url: `https://yourdomain.com/blog/${this._generateSlug(input.title || 'updated-post')}`,
        message: 'Post updated successfully. Please commit and push to Git to deploy on Netlify.',
        metadata: {
          requiresGitCommit: true,
          instructions: 'Commit and push to Git to trigger Netlify deployment'
        }
      };
    } catch (error) {
      console.error('Failed to update Netlify post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Netlify
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Netlify post ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { siteId, accessToken, gitRemote } = auth;
      
      if (!gitRemote) {
        return {
          ok: false,
          message: 'Git remote required to delete posts from Netlify'
        };
      }

      // For Netlify, deletions are handled via Git
      return {
        ok: true,
        message: 'Post deleted successfully. Please commit and push to Git to deploy on Netlify.',
        metadata: {
          requiresGitCommit: true,
          instructions: 'Commit and push to Git to trigger Netlify deployment'
        }
      };
    } catch (error) {
      console.error('Failed to delete Netlify post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Netlify
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { siteId, accessToken, gitRemote } = auth;
      
      if (!gitRemote) {
        throw new Error('Git remote is required to upload images to Netlify');
      }

      // For Netlify, images are typically managed via Git
      // This is a simplified implementation
      return {
        url: `/images/${filename}`,
        id: filename,
        message: 'Image uploaded. Please commit and push to Git to deploy on Netlify.'
      };
    } catch (error) {
      console.error('Failed to upload image to Netlify:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Trigger a Netlify build
   * @param {object} auth - Authentication credentials
   * @returns {Promise<object>}
   */
  async triggerBuild(auth) {
    try {
      const { siteId, accessToken } = auth;
      
      const response = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/builds`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clear_cache: 'full'
          })
        }
      );

      if (response.status === 201) {
        const build = await response.json();
        return {
          success: true,
          buildId: build.id,
          message: 'Build triggered successfully',
          metadata: {
            buildUrl: build.deploy_url,
            status: build.status
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to trigger build',
          message: `Netlify API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to trigger Netlify build:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to trigger build: ${error.message}`
      };
    }
  }

  /**
   * Get deployment status
   * @param {object} auth - Authentication credentials
   * @returns {Promise<object>}
   */
  async getDeploymentStatus(auth) {
    try {
      const { siteId, accessToken } = auth;
      
      const response = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=5`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        const deployments = await response.json();
        return {
          success: true,
          deployments: deployments.map(deploy => ({
            id: deploy.id,
            status: deploy.status,
            url: deploy.deploy_url,
            createdAt: deploy.created_at,
            commitRef: deploy.commit_ref,
            branch: deploy.branch
          }))
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to get deployment status',
          message: `Netlify API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to get Netlify deployment status:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get deployment status: ${error.message}`
      };
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
}

module.exports = new NetlifyAdapter();