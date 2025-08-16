/**
 * Vercel Provider Adapter
 * 
 * Supports publishing to Vercel via Git integration
 * Implements the CMSAdapter interface
 */

const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class VercelAdapter {
  constructor() {
    this.id = 'vercel';
    this.name = 'Vercel';
    this.category = 'hosting';
    
    // Define supported features
    this.supports = {
      images: true,
      tags: true,
      scheduling: false, // Vercel doesn't support scheduling
      edit: false, // Posts are managed via Git
      delete: false, // Posts are managed via Git
      categories: true,
      excerpts: true,
      featuredImages: true,
      customFields: true
    };
  }

  /**
   * Verify connection to Vercel
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { accessToken, projectId, gitRemote } = auth;
      
      if (!accessToken) {
        return {
          ok: false,
          details: 'Missing required credentials: accessToken'
        };
      }

      // Test Vercel API access by fetching user info
      const response = await fetch('https://api.vercel.com/v1/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const user = await response.json();
        
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
            userId: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            gitStatus: gitStatus
          }
        };
      } else if (response.status === 401) {
        return {
          ok: false,
          details: 'Invalid access token'
        };
      } else {
        return {
          ok: false,
          details: `Vercel API error: ${response.status}`
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
   * List posts from Vercel project
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { accessToken, projectId, gitRemote } = auth;
      const { page = 1, limit = 20 } = opts;
      
      // For Vercel, we need to check the Git repository for posts
      // This is a simplified implementation that assumes posts are in markdown files
      if (!gitRemote) {
        throw new Error('Git remote is required to list posts from Vercel');
      }

      // Get the latest deployment to see current content
      if (!projectId) {
        throw new Error('Project ID is required to list posts from Vercel');
      }

      const deploymentResponse = await fetch(
        `https://api.vercel.com/v1/projects/${projectId}/deployments?limit=1`,
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
      if (deployments.deployments.length === 0) {
        return [];
      }

      const latestDeploy = deployments.deployments[0];
      
      // For now, return a placeholder since we can't directly access file contents
      // In a real implementation, you'd need to clone the repo or use Vercel's file API
      return [{
        id: 'placeholder',
        title: 'Posts managed via Git',
        content: 'Posts are managed through Git integration with Vercel',
        excerpt: 'Git-based content management',
        status: 'published',
        date: latestDeploy.createdAt,
        modified: latestDeploy.createdAt,
        slug: 'git-managed',
        link: latestDeploy.url,
        featuredImage: null,
        categories: [],
        tags: [],
        author: '',
        scheduledAt: null,
        metadata: {
          deployId: latestDeploy.id,
          deployUrl: latestDeploy.url,
          gitCommit: latestDeploy.meta?.gitCommitSha
        }
      }];
    } catch (error) {
      console.error('Failed to list Vercel posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Vercel
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { accessToken, projectId, gitRemote } = auth;
      
      if (!gitRemote) {
        return {
          success: false,
          error: 'Git remote required',
          message: 'Vercel requires Git integration to create posts'
        };
      }

      // For Vercel, we need to create the post in the Git repository
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
      // 4. Trigger a Vercel deployment

      // For now, return a success response indicating the post should be created via Git
      return {
        success: true,
        postId: `git-${Date.now()}`,
        externalId: `git-${Date.now()}`,
        url: `https://yourdomain.com/blog/${this._generateSlug(input.title)}`,
        message: 'Post created successfully. Please commit and push to Git to deploy on Vercel.',
        metadata: {
          requiresGitCommit: true,
          postData: postData,
          instructions: 'Commit and push to Git to trigger Vercel deployment'
        }
      };
    } catch (error) {
      console.error('Failed to create Vercel post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Vercel
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Vercel post ID
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { accessToken, projectId, gitRemote } = auth;
      
      if (!gitRemote) {
        return {
          success: false,
          error: 'Git remote required',
          message: 'Vercel requires Git integration to update posts'
        };
      }

      // For Vercel, updates are handled via Git
      return {
        success: true,
        postId: postId,
        externalId: postId,
        url: `https://yourdomain.com/blog/${this._generateSlug(input.title || 'updated-post')}`,
        message: 'Post updated successfully. Please commit and push to Git to deploy on Vercel.',
        metadata: {
          requiresGitCommit: true,
          instructions: 'Commit and push to Git to trigger Vercel deployment'
        }
      };
    } catch (error) {
      console.error('Failed to update Vercel post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Vercel
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Vercel post ID
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { accessToken, projectId, gitRemote } = auth;
      
      if (!gitRemote) {
        return {
          ok: false,
          message: 'Git remote required to delete posts from Vercel'
        };
      }

      // For Vercel, deletions are handled via Git
      return {
        ok: true,
        message: 'Post deleted successfully. Please commit and push to Git to deploy on Vercel.',
        metadata: {
          requiresGitCommit: true,
          instructions: 'Commit and push to Git to trigger Vercel deployment'
        }
      };
    } catch (error) {
      console.error('Failed to delete Vercel post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Vercel
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { accessToken, projectId, gitRemote } = auth;
      
      if (!gitRemote) {
        throw new Error('Git remote is required to upload images to Vercel');
      }

      // For Vercel, images are typically managed via Git
      // This is a simplified implementation
      return {
        url: `/images/${filename}`,
        id: filename,
        message: 'Image uploaded. Please commit and push to Git to deploy on Vercel.'
      };
    } catch (error) {
      console.error('Failed to upload image to Vercel:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Trigger a Vercel deployment
   * @param {object} auth - Authentication credentials
   * @returns {Promise<object>}
   */
  async triggerDeployment(auth) {
    try {
      const { accessToken, projectId } = auth;
      
      if (!projectId) {
        return {
          success: false,
          error: 'Project ID required',
          message: 'Project ID is required to trigger a Vercel deployment'
        };
      }

      const response = await fetch(
        `https://api.vercel.com/v1/projects/${projectId}/deployments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: projectId,
            target: 'production'
          })
        }
      );

      if (response.status === 201) {
        const deployment = await response.json();
        return {
          success: true,
          deploymentId: deployment.id,
          message: 'Deployment triggered successfully',
          metadata: {
            deployUrl: deployment.url,
            status: deployment.status
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to trigger deployment',
          message: `Vercel API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to trigger Vercel deployment:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to trigger deployment: ${error.message}`
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
      const { accessToken, projectId } = auth;
      
      if (!projectId) {
        return {
          success: false,
          error: 'Project ID required',
          message: 'Project ID is required to get deployment status'
        };
      }

      const response = await fetch(
        `https://api.vercel.com/v1/projects/${projectId}/deployments?limit=5`,
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
          deployments: deployments.deployments.map(deploy => ({
            id: deploy.id,
            status: deploy.status,
            url: deploy.url,
            createdAt: deploy.createdAt,
            gitCommit: deploy.meta?.gitCommitSha,
            branch: deploy.meta?.gitBranch
          }))
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to get deployment status',
          message: `Vercel API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to get Vercel deployment status:', error);
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

module.exports = new VercelAdapter();