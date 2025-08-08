const database = require('../config/database');

class DraftController {
  // Save draft
  async saveDraft(req, res) {
    try {
      const { title, content, excerpt, featuredImage } = req.validatedData;
      const { userId } = req.user;
      const db = database.getDB();

      const draftId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO drafts (user_id, title, content, excerpt, featured_image) VALUES (?, ?, ?, ?, ?)',
          [userId, title, content, excerpt || '', featuredImage || ''],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      res.status(201).json({
        success: true,
        message: 'Draft saved successfully',
        data: {
          draftId,
          title,
          content,
          excerpt,
          featuredImage
        }
      });

    } catch (error) {
      console.error('Save draft error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save draft'
      });
    }
  }

  // Get all drafts for user
  async getDrafts(req, res) {
    try {
      const { userId } = req.user;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const db = database.getDB();

      // Get drafts with pagination
      const drafts = await new Promise((resolve, reject) => {
        db.all(
          'SELECT id, title, content, excerpt, featured_image, created_at, updated_at FROM drafts WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?',
          [userId, parseInt(limit), offset],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      // Get total count
      const total = await new Promise((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as count FROM drafts WHERE user_id = ?',
          [userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          }
        );
      });

      res.json({
        success: true,
        data: {
          drafts: drafts.map(draft => ({
            id: draft.id,
            title: draft.title,
            excerpt: draft.excerpt || draft.content.substring(0, 150) + '...',
            featuredImage: draft.featured_image,
            createdAt: draft.created_at,
            updatedAt: draft.updated_at
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get drafts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch drafts'
      });
    }
  }

  // Get single draft
  async getDraft(req, res) {
    try {
      const { userId } = req.user;
      const { draftId } = req.params;
      const db = database.getDB();

      const draft = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM drafts WHERE id = ? AND user_id = ?',
          [draftId, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!draft) {
        return res.status(404).json({
          success: false,
          message: 'Draft not found'
        });
      }

      res.json({
        success: true,
        data: {
          draft: {
            id: draft.id,
            title: draft.title,
            content: draft.content,
            excerpt: draft.excerpt,
            featuredImage: draft.featured_image,
            createdAt: draft.created_at,
            updatedAt: draft.updated_at
          }
        }
      });

    } catch (error) {
      console.error('Get draft error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch draft'
      });
    }
  }

  // Update draft
  async updateDraft(req, res) {
    try {
      const { userId } = req.user;
      const { draftId } = req.params;
      const updateData = req.validatedData;
      const db = database.getDB();

      // Check if draft exists and belongs to user
      const existingDraft = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM drafts WHERE id = ? AND user_id = ?',
          [draftId, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!existingDraft) {
        return res.status(404).json({
          success: false,
          message: 'Draft not found'
        });
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (updateData.title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(updateData.title);
      }
      if (updateData.content !== undefined) {
        updateFields.push('content = ?');
        updateValues.push(updateData.content);
      }
      if (updateData.excerpt !== undefined) {
        updateFields.push('excerpt = ?');
        updateValues.push(updateData.excerpt);
      }
      if (updateData.featuredImage !== undefined) {
        updateFields.push('featured_image = ?');
        updateValues.push(updateData.featuredImage);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(draftId, userId);

      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE drafts SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
          updateValues,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Get updated draft
      const updatedDraft = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM drafts WHERE id = ? AND user_id = ?',
          [draftId, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      res.json({
        success: true,
        message: 'Draft updated successfully',
        data: {
          draft: {
            id: updatedDraft.id,
            title: updatedDraft.title,
            content: updatedDraft.content,
            excerpt: updatedDraft.excerpt,
            featuredImage: updatedDraft.featured_image,
            updatedAt: updatedDraft.updated_at
          }
        }
      });

    } catch (error) {
      console.error('Update draft error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update draft'
      });
    }
  }

  // Delete draft
  async deleteDraft(req, res) {
    try {
      const { userId } = req.user;
      const { draftId } = req.params;
      const db = database.getDB();

      const result = await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM drafts WHERE id = ? AND user_id = ?',
          [draftId, userId],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });

      if (result === 0) {
        return res.status(404).json({
          success: false,
          message: 'Draft not found'
        });
      }

      res.json({
        success: true,
        message: 'Draft deleted successfully'
      });

    } catch (error) {
      console.error('Delete draft error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete draft'
      });
    }
  }

  // Publish draft to WordPress
  async publishDraft(req, res) {
    try {
      const { userId } = req.user;
      const { draftId } = req.params;
      const { siteId, status = 'draft' } = req.body;
      const db = database.getDB();

      // Get draft
      const draft = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM drafts WHERE id = ? AND user_id = ?',
          [draftId, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!draft) {
        return res.status(404).json({
          success: false,
          message: 'Draft not found'
        });
      }

      // Get site credentials (reuse from WordPress controller)
      const WordPressController = require('./wordpressController');
      const site = await WordPressController.getSiteCredentials(userId, siteId, db);
      
      if (!site) {
        return res.status(404).json({
          success: false,
          message: 'WordPress site not found'
        });
      }

      // Create post data
      const postData = {
        title: draft.title,
        content: draft.content,
        status: status
      };

      if (draft.excerpt) postData.excerpt = draft.excerpt;
      if (draft.featured_image) postData.featured_media = draft.featured_image;

      // Post to WordPress
      const axios = require('axios');
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

      // Optionally delete the draft after successful publish
      if (status === 'publish') {
        await new Promise((resolve, reject) => {
          db.run(
            'DELETE FROM drafts WHERE id = ? AND user_id = ?',
            [draftId, userId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      res.json({
        success: true,
        message: 'Draft published successfully',
        data: {
          postId: response.data.id,
          title: response.data.title.rendered,
          status: response.data.status,
          url: response.data.link,
          date: response.data.date
        }
      });

    } catch (error) {
      console.error('Publish draft error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to publish draft'
      });
    }
  }
}

module.exports = new DraftController();