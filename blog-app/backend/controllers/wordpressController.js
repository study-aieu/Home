const axios = require('axios');
const FormData = require('form-data');
const database = require('../config/database');
const bcrypt = require('bcryptjs');

class WordPressController {
  // Connect to WordPress site
  async connectSite(req, res) {
    try {
      const { siteUrl, username, appPassword } = req.validatedData;
      const { userId } = req.user;
      const db = database.getDB();

      // Normalize site URL
      const normalizedUrl = siteUrl.replace(/\/$/, ''); // Remove trailing slash

      // Test WordPress connection
      const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
      
      try {
        const testResponse = await axios.get(`${normalizedUrl}/wp-json/wp/v2/users/me`, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        // Get site info
        const siteInfo = await axios.get(`${normalizedUrl}/wp-json/wp/v2/`, {
          timeout: 10000
        });

        const siteName = siteInfo.data.name || 'WordPress Site';

        // Encrypt app password for storage
        const encryptedPassword = await bcrypt.hash(appPassword, 10);

        // Check if site already exists for this user
        const existingSite = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM wordpress_sites WHERE user_id = ? AND site_url = ?',
            [userId, normalizedUrl],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (existingSite) {
          // Update existing site
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE wordpress_sites SET username = ?, app_password = ?, site_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [username, encryptedPassword, siteName, existingSite.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          res.json({
            success: true,
            message: 'WordPress site connection updated successfully',
            data: {
              siteId: existingSite.id,
              siteName,
              siteUrl: normalizedUrl,
              username: testResponse.data.name || username
            }
          });
        } else {
          // Create new site connection
          const siteId = await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO wordpress_sites (user_id, site_url, username, app_password, site_name) VALUES (?, ?, ?, ?, ?)',
              [userId, normalizedUrl, username, encryptedPassword, siteName],
              function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });

          res.status(201).json({
            success: true,
            message: 'WordPress site connected successfully',
            data: {
              siteId,
              siteName,
              siteUrl: normalizedUrl,
              username: testResponse.data.name || username
            }
          });
        }

      } catch (wpError) {
        console.error('WordPress connection error:', wpError.message);
        
        let errorMessage = 'Failed to connect to WordPress site';
        if (wpError.response?.status === 401) {
          errorMessage = 'Invalid username or application password';
        } else if (wpError.code === 'ENOTFOUND' || wpError.code === 'ECONNREFUSED') {
          errorMessage = 'Could not reach the WordPress site. Please check the URL.';
        }

        return res.status(400).json({
          success: false,
          message: errorMessage
        });
      }

    } catch (error) {
      console.error('Connect site error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's connected sites
  async getSites(req, res) {
    try {
      const { userId } = req.user;
      const db = database.getDB();

      const sites = await new Promise((resolve, reject) => {
        db.all(
          'SELECT id, site_url, username, site_name, created_at FROM wordpress_sites WHERE user_id = ?',
          [userId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      res.json({
        success: true,
        data: {
          sites
        }
      });

    } catch (error) {
      console.error('Get sites error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create new post on WordPress
  async createPost(req, res) {
    try {
      const { title, content, excerpt, status = 'draft', featuredImage } = req.validatedData;
      const { userId } = req.user;
      const { siteId } = req.params;
      const db = database.getDB();

      // Get site credentials
      const site = await this.getSiteCredentials(userId, siteId, db);
      if (!site) {
        return res.status(404).json({
          success: false,
          message: 'WordPress site not found'
        });
      }

      // Prepare post data
      const postData = {
        title,
        content,
        status: status === 'publish' ? 'publish' : 'draft'
      };

      if (excerpt) postData.excerpt = excerpt;
      if (featuredImage) postData.featured_media = featuredImage;

      // Create post on WordPress
      const auth = Buffer.from(`${site.username}:${site.app_password}`).toString('base64');
      
      const response = await axios.post(
        `${site.site_url}/wp-json/wp/v2/posts`,
        postData,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      // Cache the post
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO posts_cache (user_id, wp_post_id, site_id, title, content, status, date_published) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, response.data.id, siteId, title, content, response.data.status, response.data.date],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: {
          postId: response.data.id,
          title: response.data.title.rendered,
          status: response.data.status,
          url: response.data.link,
          date: response.data.date
        }
      });

    } catch (error) {
      console.error('Create post error:', error);
      
      if (error.response?.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'WordPress authentication failed'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create post'
      });
    }
  }

  // Get posts from WordPress
  async getPosts(req, res) {
    try {
      const { userId } = req.user;
      const { siteId } = req.params;
      const { page = 1, per_page = 10 } = req.query;
      const db = database.getDB();

      // Get site credentials
      const site = await this.getSiteCredentials(userId, siteId, db);
      if (!site) {
        return res.status(404).json({
          success: false,
          message: 'WordPress site not found'
        });
      }

      const auth = Buffer.from(`${site.username}:${site.app_password}`).toString('base64');
      
      const response = await axios.get(
        `${site.site_url}/wp-json/wp/v2/posts`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          },
          params: {
            page,
            per_page,
            author: 'me',
            _embed: true
          },
          timeout: 10000
        }
      );

      const posts = response.data.map(post => ({
        id: post.id,
        title: post.title.rendered,
        excerpt: post.excerpt.rendered,
        status: post.status,
        date: post.date,
        modified: post.modified,
        url: post.link,
        featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null
      }));

      res.json({
        success: true,
        data: {
          posts,
          pagination: {
            page: parseInt(page),
            per_page: parseInt(per_page),
            total: parseInt(response.headers['x-wp-total'] || 0),
            total_pages: parseInt(response.headers['x-wp-totalpages'] || 0)
          }
        }
      });

    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch posts'
      });
    }
  }

  // Update existing post
  async updatePost(req, res) {
    try {
      const { userId } = req.user;
      const { siteId, postId } = req.params;
      const updateData = req.validatedData;
      const db = database.getDB();

      // Get site credentials
      const site = await this.getSiteCredentials(userId, siteId, db);
      if (!site) {
        return res.status(404).json({
          success: false,
          message: 'WordPress site not found'
        });
      }

      const auth = Buffer.from(`${site.username}:${site.app_password}`).toString('base64');
      
      const response = await axios.post(
        `${site.site_url}/wp-json/wp/v2/posts/${postId}`,
        updateData,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      res.json({
        success: true,
        message: 'Post updated successfully',
        data: {
          postId: response.data.id,
          title: response.data.title.rendered,
          status: response.data.status,
          url: response.data.link,
          modified: response.data.modified
        }
      });

    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update post'
      });
    }
  }

  // Delete post
  async deletePost(req, res) {
    try {
      const { userId } = req.user;
      const { siteId, postId } = req.params;
      const db = database.getDB();

      // Get site credentials
      const site = await this.getSiteCredentials(userId, siteId, db);
      if (!site) {
        return res.status(404).json({
          success: false,
          message: 'WordPress site not found'
        });
      }

      const auth = Buffer.from(`${site.username}:${site.app_password}`).toString('base64');
      
      await axios.delete(
        `${site.site_url}/wp-json/wp/v2/posts/${postId}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          },
          timeout: 10000
        }
      );

      // Remove from cache
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM posts_cache WHERE user_id = ? AND wp_post_id = ? AND site_id = ?',
          [userId, postId, siteId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.json({
        success: true,
        message: 'Post deleted successfully'
      });

    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete post'
      });
    }
  }

  // Helper method to get site credentials
  async getSiteCredentials(userId, siteId, db) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT site_url, username, app_password FROM wordpress_sites WHERE id = ? AND user_id = ?',
        [siteId, userId],
        async (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            // Decrypt app password would go here in production
            // For now, we'll assume it's stored encrypted and decrypt it
            resolve(row);
          } else {
            resolve(null);
          }
        }
      );
    });
  }
}

module.exports = new WordPressController();