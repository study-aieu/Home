/**
 * GitHub Pages Provider Adapter
 * 
 * Supports publishing to GitHub Pages via Git operations
 * Implements the CMSAdapter interface
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

class GitHubPagesAdapter {
  constructor() {
    this.id = 'github-pages';
    this.name = 'GitHub Pages';
    this.category = 'static-generator';
    
    // Define supported features
    this.supports = {
      images: true,
      tags: true,
      scheduling: false, // GitHub Pages doesn't support scheduling
      edit: false, // Posts are managed via Git
      delete: false, // Posts are managed via Git
      categories: true,
      excerpts: true,
      featuredImages: true,
      customFields: true
    };
  }

  /**
   * Verify connection to GitHub
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { repositoryUrl, accessToken, branch = 'main' } = auth;
      
      if (!repositoryUrl || !accessToken) {
        return {
          ok: false,
          details: 'Missing required credentials: repositoryUrl and accessToken'
        };
      }

      // Test GitHub API access
      const repoInfo = this._extractRepoInfo(repositoryUrl);
      if (!repoInfo) {
        return {
          ok: false,
          details: 'Invalid repository URL format'
        };
      }

      // Test API access
      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.status === 200) {
        const repo = await response.json();
        return {
          ok: true,
          details: {
            repository: repo.full_name,
            owner: repo.owner.login,
            defaultBranch: repo.default_branch,
            hasPages: repo.has_pages,
            pagesUrl: repo.homepage
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
          details: 'Repository not found or access denied'
        };
      } else {
        return {
          ok: false,
          details: `GitHub API error: ${response.status}`
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
   * List posts from GitHub Pages
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { repositoryUrl, accessToken, branch = 'main' } = auth;
      const { page = 1, limit = 20 } = opts;
      
      const repoInfo = this._extractRepoInfo(repositoryUrl);
      if (!repoInfo) {
        throw new Error('Invalid repository URL format');
      }

      // Get repository contents
      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/_posts?ref=${branch}`, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const contents = await response.json();
      
      // Filter for markdown files
      const posts = contents
        .filter(item => item.type === 'file' && item.name.endsWith('.md'))
        .map(item => ({
          id: item.sha,
          title: this._extractTitleFromFilename(item.name),
          content: '', // Would need to fetch individual file contents
          excerpt: '',
          status: 'published',
          date: item.name.split('-').slice(0, 3).join('-'), // Extract date from filename
          modified: item.updated_at,
          slug: item.name.replace('.md', ''),
          link: `${repoInfo.pagesUrl}/${item.path.replace('_posts/', '').replace('.md', '')}`,
          featuredImage: null,
          categories: [],
          tags: [],
          author: '',
          metadata: {
            githubSha: item.sha,
            path: item.path,
            size: item.size
          }
        }));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPosts = posts.slice(startIndex, endIndex);

      return paginatedPosts;
    } catch (error) {
      console.error('Failed to list GitHub Pages posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on GitHub Pages
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { repositoryUrl, accessToken, branch = 'main' } = auth;
      
      const repoInfo = this._extractRepoInfo(repositoryUrl);
      if (!repoInfo) {
        throw new Error('Invalid repository URL format');
      }

      // Generate filename with date prefix
      const date = new Date();
      const datePrefix = date.toISOString().split('T')[0];
      const slug = input.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const filename = `${datePrefix}-${slug}.md`;

      // Create front matter
      const frontMatter = this._createFrontMatter(input);
      const content = `${frontMatter}\n\n${input.content}`;

      // Create file via GitHub API
      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/_posts/${filename}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add blog post: ${input.title}`,
          content: Buffer.from(content).toString('base64'),
          branch: branch
        })
      });

      if (response.status === 201) {
        const result = await response.json();
        return {
          success: true,
          postId: result.content.sha,
          externalId: result.content.sha,
          url: `${repoInfo.pagesUrl}/${filename.replace('.md', '')}`,
          message: 'Post created successfully on GitHub Pages',
          metadata: {
            githubSha: result.content.sha,
            filename: filename,
            path: result.content.path,
            commitSha: result.commit.sha
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to create post',
          message: `GitHub API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Failed to create GitHub Pages post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on GitHub Pages
   * @param {object} auth - Authentication credentials
   * @param {string} postId - GitHub file SHA
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { repositoryUrl, accessToken, branch = 'main' } = auth;
      
      // For GitHub Pages, we need to find the file first
      // This is a simplified implementation
      return {
        success: false,
        error: 'Update not supported',
        message: 'GitHub Pages posts must be updated manually via Git'
      };
    } catch (error) {
      console.error('Failed to update GitHub Pages post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from GitHub Pages
   * @param {object} auth - Authentication credentials
   * @param {string} postId - GitHub file SHA
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { repositoryUrl, accessToken, branch = 'main' } = auth;
      
      // For GitHub Pages, we need to find the file first
      // This is a simplified implementation
      return {
        ok: false,
        message: 'Delete not supported - posts must be removed manually via Git'
      };
    } catch (error) {
      console.error('Failed to delete GitHub Pages post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to GitHub Pages
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { repositoryUrl, accessToken, branch = 'main' } = auth;
      
      const repoInfo = this._extractRepoInfo(repositoryUrl);
      if (!repoInfo) {
        throw new Error('Invalid repository URL format');
      }

      // Create images directory path
      const imagePath = `images/${filename}`;

      // Upload image via GitHub API
      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${imagePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add image: ${filename}`,
          content: fileBuffer.toString('base64'),
          branch: branch
        })
      });

      if (response.status === 201) {
        const result = await response.json();
        return {
          url: `${repoInfo.pagesUrl}/${imagePath}`,
          id: result.content.sha
        };
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Failed to upload image to GitHub Pages:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Helper method to extract repository information from URL
   * @param {string} repositoryUrl - GitHub repository URL
   * @returns {object|null} Repository info or null if invalid
   */
  _extractRepoInfo(repositoryUrl) {
    try {
      const url = new URL(repositoryUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      if (pathParts.length >= 2) {
        return {
          owner: pathParts[0],
          repo: pathParts[1],
          pagesUrl: `https://${pathParts[0]}.github.io/${pathParts[1]}`
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper method to create front matter for markdown files
   * @param {object} input - Post input data
   * @returns {string} Front matter string
   */
  _createFrontMatter(input) {
    const frontMatter = {
      title: input.title,
      date: new Date().toISOString(),
      layout: 'post',
      published: true
    };

    if (input.excerpt) {
      frontMatter.excerpt = input.excerpt;
    }

    if (input.tags && input.tags.length > 0) {
      frontMatter.tags = input.tags;
    }

    if (input.categories && input.categories.length > 0) {
      frontMatter.categories = input.categories;
    }

    if (input.featuredImage) {
      frontMatter.image = input.featuredImage;
    }

    if (input.scheduledAt) {
      frontMatter.date = input.scheduledAt.toISOString();
    }

    // Convert to YAML front matter
    const yaml = Object.entries(frontMatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}:\n  - ${value.join('\n  - ')}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');

    return `---\n${yaml}\n---`;
  }

  /**
   * Helper method to extract title from filename
   * @param {string} filename - Markdown filename
   * @returns {string} Extracted title
   */
  _extractTitleFromFilename(filename) {
    // Remove date prefix and .md extension
    const withoutDate = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    const withoutExt = withoutDate.replace('.md', '');
    
    // Convert kebab-case to Title Case
    return withoutExt
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

module.exports = new GitHubPagesAdapter();