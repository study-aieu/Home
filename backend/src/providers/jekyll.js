/**
 * Jekyll Provider Adapter
 * 
 * Supports publishing to Jekyll static site generator
 * Implements the CMSAdapter interface
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class JekyllAdapter {
  constructor() {
    this.id = 'jekyll';
    this.name = 'Jekyll';
    this.category = 'static-generator';
    
    // Define supported features
    this.supports = {
      images: true,
      tags: true,
      scheduling: false, // Jekyll doesn't support scheduling
      edit: false, // Posts are managed via Git
      delete: false, // Posts are managed via Git
      categories: true,
      excerpts: true,
      featuredImages: true,
      customFields: true
    };
  }

  /**
   * Verify connection to Jekyll site
   * @param {object} auth - Authentication credentials
   * @returns {Promise<{ok: boolean, details?: any}>}
   */
  async verifyConnection(auth) {
    try {
      const { sitePath, gitRemote } = auth;
      
      if (!sitePath) {
        return {
          ok: false,
          details: 'Missing required credentials: sitePath'
        };
      }

      // Check if Jekyll site exists
      try {
        const configPath = path.join(sitePath, '_config.yml');
        const configExists = await fs.access(configPath).then(() => true).catch(() => false);
        
        if (!configExists) {
          return {
            ok: false,
            details: 'Jekyll site not found at specified path'
          };
        }

        // Check if it's a valid Jekyll site
        const configContent = await fs.readFile(configPath, 'utf8');
        if (!configContent.includes('title') && !configContent.includes('baseurl')) {
          return {
            ok: false,
            details: 'Invalid Jekyll configuration file'
          };
        }

        // Check if posts directory exists
        const postsPath = path.join(sitePath, '_posts');
        const postsExists = await fs.access(postsPath).then(() => true).catch(() => false);

        // Check if images directory exists
        const imagesPath = path.join(sitePath, 'assets', 'images');
        const imagesExists = await fs.access(imagesPath).then(() => true).catch(() => false);

        // Check if Jekyll is installed
        let jekyllVersion = null;
        try {
          const { stdout } = await execAsync('jekyll --version', { cwd: sitePath });
          jekyllVersion = stdout.trim();
        } catch (error) {
          jekyllVersion = 'Not installed';
        }

        // Check Git status if gitRemote is provided
        let gitStatus = null;
        if (gitRemote) {
          try {
            const { stdout } = await execAsync('git remote -v', { cwd: sitePath });
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
            sitePath: sitePath,
            configExists: true,
            postsDirectory: postsExists,
            imagesDirectory: imagesExists,
            jekyllVersion: jekyllVersion,
            gitStatus: gitStatus
          }
        };
      } catch (error) {
        return {
          ok: false,
          details: `Failed to verify Jekyll site: ${error.message}`
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
   * List posts from Jekyll site
   * @param {object} auth - Authentication credentials
   * @param {object} opts - Options for listing posts
   * @returns {Promise<Array>}
   */
  async listPosts(auth, opts = {}) {
    try {
      const { sitePath } = auth;
      const { page = 1, limit = 20 } = opts;
      
      const postsPath = path.join(sitePath, '_posts');
      
      // Check if posts directory exists
      try {
        await fs.access(postsPath);
      } catch (error) {
        return [];
      }

      // Read all markdown files in posts directory
      const files = await fs.readdir(postsPath);
      const markdownFiles = files.filter(file => file.endsWith('.md') || file.endsWith('.markdown'));

      // Parse each markdown file to extract front matter
      const posts = [];
      for (const file of markdownFiles) {
        try {
          const filePath = path.join(postsPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          const post = this._parseMarkdownFile(content, file);
          if (post) {
            posts.push(post);
          }
        } catch (error) {
          console.warn(`Failed to parse post ${file}:`, error.message);
        }
      }

      // Sort posts by date (newest first)
      posts.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPosts = posts.slice(startIndex, endIndex);

      return paginatedPosts;
    } catch (error) {
      console.error('Failed to list Jekyll posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create a new post on Jekyll site
   * @param {object} auth - Authentication credentials
   * @param {object} input - Post data
   * @returns {Promise<object>}
   */
  async createPost(auth, input) {
    try {
      const { sitePath, gitRemote } = auth;
      
      // Ensure posts directory exists
      const postsPath = path.join(sitePath, '_posts');
      await fs.mkdir(postsPath, { recursive: true });

      // Generate filename with date prefix
      const date = new Date();
      const datePrefix = date.toISOString().split('T')[0];
      const slug = this._generateSlug(input.title);
      const filename = `${datePrefix}-${slug}.md`;

      // Create front matter
      const frontMatter = this._createFrontMatter(input);
      const content = `${frontMatter}\n\n${input.content}`;

      // Write the markdown file
      const filePath = path.join(postsPath, filename);
      await fs.writeFile(filePath, content, 'utf8');

      // Commit to Git if gitRemote is provided
      let gitCommit = null;
      if (gitRemote) {
        try {
          await execAsync('git add .', { cwd: sitePath });
          await execAsync(`git commit -m "Add blog post: ${input.title}"`, { cwd: sitePath });
          
          // Try to push to remote
          try {
            await execAsync('git push', { cwd: sitePath });
            gitCommit = {
              committed: true,
              pushed: true,
              message: `Add blog post: ${input.title}`
            };
          } catch (pushError) {
            gitCommit = {
              committed: true,
              pushed: false,
              pushError: pushError.message,
              message: `Add blog post: ${input.title}`
            };
          }
        } catch (commitError) {
          gitCommit = {
            committed: false,
            error: commitError.message
          };
        }
      }

      return {
        success: true,
        postId: filename,
        externalId: filename,
        url: `https://yourdomain.com/blog/${slug}`,
        message: 'Post created successfully on Jekyll site',
        metadata: {
          filename: filename,
          filePath: filePath,
          gitCommit: gitCommit
        }
      };
    } catch (error) {
      console.error('Failed to create Jekyll post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Update an existing post on Jekyll site
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Jekyll post filename
   * @param {object} input - Updated post data
   * @returns {Promise<object>}
   */
  async updatePost(auth, postId, input) {
    try {
      const { sitePath, gitRemote } = auth;
      
      const postsPath = path.join(sitePath, '_posts');
      const filePath = path.join(postsPath, postId);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return {
          success: false,
          error: 'Post not found',
          message: `Post file not found: ${postId}`
        };
      }

      // Read existing content to preserve any custom front matter
      const existingContent = await fs.readFile(filePath, 'utf8');
      const { frontMatter: existingFrontMatter, content: existingBody } = this._parseMarkdownContent(existingContent);

      // Create updated front matter
      const updatedFrontMatter = this._updateFrontMatter(existingFrontMatter, input);
      const updatedContent = `${updatedFrontMatter}\n\n${input.content || existingBody}`;

      // Write the updated file
      await fs.writeFile(filePath, updatedContent, 'utf8');

      // Commit to Git if gitRemote is provided
      let gitCommit = null;
      if (gitRemote) {
        try {
          await execAsync('git add .', { cwd: sitePath });
          await execAsync(`git commit -m "Update blog post: ${input.title || postId}"`, { cwd: sitePath });
          
          try {
            await execAsync('git push', { cwd: sitePath });
            gitCommit = {
              committed: true,
              pushed: true,
              message: `Update blog post: ${input.title || postId}`
            };
          } catch (pushError) {
            gitCommit = {
              committed: true,
              pushed: false,
              pushError: pushError.message,
              message: `Update blog post: ${input.title || postId}`
            };
          }
        } catch (commitError) {
          gitCommit = {
            committed: false,
            error: commitError.message
          };
        }
      }

      return {
        success: true,
        postId: postId,
        externalId: postId,
        url: `https://yourdomain.com/blog/${postId.replace(/\.(md|markdown)$/, '')}`,
        message: 'Post updated successfully on Jekyll site',
        metadata: {
          filename: postId,
          filePath: filePath,
          gitCommit: gitCommit
        }
      };
    } catch (error) {
      console.error('Failed to update Jekyll post:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update post: ${error.message}`
      };
    }
  }

  /**
   * Delete a post from Jekyll site
   * @param {object} auth - Authentication credentials
   * @param {string} postId - Jekyll post filename
   * @returns {Promise<{ok: boolean, message?: string}>}
   */
  async deletePost(auth, postId) {
    try {
      const { sitePath, gitRemote } = auth;
      
      const postsPath = path.join(sitePath, '_posts');
      const filePath = path.join(postsPath, postId);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return {
          ok: false,
          message: `Post file not found: ${postId}`
        };
      }

      // Delete the file
      await fs.unlink(filePath);

      // Commit to Git if gitRemote is provided
      let gitCommit = null;
      if (gitRemote) {
        try {
          await execAsync('git add .', { cwd: sitePath });
          await execAsync(`git commit -m "Delete blog post: ${postId}"`, { cwd: sitePath });
          
          try {
            await execAsync('git push', { cwd: sitePath });
            gitCommit = {
              committed: true,
              pushed: true,
              message: `Delete blog post: ${postId}`
            };
          } catch (pushError) {
            gitCommit = {
              committed: true,
              pushed: false,
              pushError: pushError.message,
              message: `Delete blog post: ${postId}`
            };
          }
        } catch (commitError) {
          gitCommit = {
            committed: false,
            error: commitError.message
          };
        }
      }

      return {
        ok: true,
        message: 'Post deleted successfully from Jekyll site',
        metadata: {
          gitCommit: gitCommit
        }
      };
    } catch (error) {
      console.error('Failed to delete Jekyll post:', error);
      return {
        ok: false,
        message: `Failed to delete post: ${error.message}`
      };
    }
  }

  /**
   * Upload an image to Jekyll site
   * @param {object} auth - Authentication credentials
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} filename - Image filename
   * @returns {Promise<{url: string, id?: string}>}
   */
  async uploadImage(auth, fileBuffer, filename) {
    try {
      const { sitePath } = auth;
      
      // Ensure images directory exists
      const imagesPath = path.join(sitePath, 'assets', 'images');
      await fs.mkdir(imagesPath, { recursive: true });

      // Write the image file
      const imagePath = path.join(imagesPath, filename);
      await fs.writeFile(imagePath, fileBuffer);

      return {
        url: `/assets/images/${filename}`,
        id: filename
      };
    } catch (error) {
      console.error('Failed to upload image to Jekyll site:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Helper method to parse markdown file content
   * @param {string} content - Markdown file content
   * @param {string} filename - Filename
   * @returns {object|null} Parsed post data or null if invalid
   */
  _parseMarkdownFile(content, filename) {
    try {
      const { frontMatter, content: body } = this._parseMarkdownContent(content);
      
      if (!frontMatter.title) {
        return null;
      }

      return {
        id: filename,
        title: frontMatter.title || '',
        content: body || '',
        excerpt: frontMatter.excerpt || '',
        status: 'published',
        date: frontMatter.date || frontMatter.publishDate || new Date().toISOString(),
        modified: new Date().toISOString(),
        slug: frontMatter.slug || filename.replace(/\.(md|markdown)$/, ''),
        link: `https://yourdomain.com/blog/${frontMatter.slug || filename.replace(/\.(md|markdown)$/, '')}`,
        featuredImage: frontMatter.image ? {
          url: frontMatter.image,
          alt: frontMatter.imageAlt || ''
        } : null,
        categories: frontMatter.categories || [],
        tags: frontMatter.tags || [],
        author: frontMatter.author || '',
        scheduledAt: null,
        metadata: {
          filename: filename,
          layout: frontMatter.layout || 'post',
          draft: frontMatter.draft || false
        }
      };
    } catch (error) {
      console.warn(`Failed to parse markdown file ${filename}:`, error.message);
      return null;
    }
  }

  /**
   * Helper method to parse markdown content into front matter and body
   * @param {string} content - Markdown content
   * @returns {object} Object with frontMatter and content
   */
  _parseMarkdownContent(content) {
    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    
    if (!frontMatterMatch) {
      return {
        frontMatter: {},
        content: content
      };
    }

    const frontMatterText = frontMatterMatch[1];
    const body = frontMatterMatch[2];

    // Parse YAML front matter (simplified)
    const frontMatter = {};
    const lines = frontMatterText.split('\n');
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        // Handle array values
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
        }
        
        frontMatter[key] = value;
      }
    }

    return {
      frontMatter: frontMatter,
      content: body
    };
  }

  /**
   * Helper method to create front matter for new posts
   * @param {object} input - Post input data
   * @returns {string} Front matter string
   */
  _createFrontMatter(input) {
    const frontMatter = {
      layout: 'post',
      title: input.title,
      date: new Date().toISOString(),
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

    if (input.author) {
      frontMatter.author = input.author;
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
   * Helper method to update existing front matter
   * @param {object} existingFrontMatter - Existing front matter
   * @param {object} input - Updated post data
   * @returns {string} Updated front matter string
   */
  _updateFrontMatter(existingFrontMatter, input) {
    const updated = { ...existingFrontMatter };

    if (input.title) {
      updated.title = input.title;
    }

    if (input.excerpt !== undefined) {
      updated.excerpt = input.excerpt;
    }

    if (input.tags) {
      updated.tags = input.tags;
    }

    if (input.categories) {
      updated.categories = input.categories;
    }

    if (input.featuredImage) {
      updated.image = input.featuredImage;
    }

    if (input.author) {
      updated.author = input.author;
    }

    // Convert to YAML front matter
    const yaml = Object.entries(updated)
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

module.exports = new JekyllAdapter();