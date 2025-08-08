import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';
import BlogSite from '../models/BlogSite';

interface AuthenticatedRequest extends Request {
  user?: any;
}

const router = express.Router();

// Create new post
router.post('/', [
  authenticateToken,
  body('siteId').isInt(),
  body('title').trim().isLength({ min: 1 }),
  body('content').exists(),
  body('status').optional().isIn(['draft', 'publish'])
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { siteId, title, content, status = 'draft', excerpt, featuredMedia } = req.body;
    const userId = req.user.id;

    // Get site connection
    const site = await BlogSite.findOne({
      where: { id: siteId, userId, isActive: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Create post data
    const postData: any = {
      title,
      content,
      status,
      excerpt: excerpt || ''
    };

    if (featuredMedia) {
      postData.featured_media = featuredMedia;
    }

    // Send to WordPress
    const response = await axios.post(
      `${site.getApiBaseUrl()}/posts`,
      postData,
      {
        headers: {
          'Authorization': site.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    res.status(201).json({
      message: 'Post created successfully',
      post: response.data
    });
  } catch (error: any) {
    console.error('Create post error:', error);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: error.response.data?.message || 'Failed to create post'
      });
    } else {
      res.status(500).json({ error: 'Failed to create post' });
    }
  }
});

// Get posts from WordPress
router.get('/:siteId', authenticateToken, async (req: any, res) => {
  try {
    const { siteId } = req.params;
    const { page = 1, perPage = 10, status = 'any' } = req.query;
    const userId = req.user.id;

    // Get site connection
    const site = await BlogSite.findOne({
      where: { id: siteId, userId, isActive: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Fetch posts from WordPress
    const response = await axios.get(
      `${site.getApiBaseUrl()}/posts`,
      {
        params: {
          page,
          per_page: perPage,
          status,
          context: 'edit'
        },
        headers: {
          'Authorization': site.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    res.json({
      posts: response.data,
      totalPages: parseInt(response.headers['x-wp-totalpages'] || '1'),
      total: parseInt(response.headers['x-wp-total'] || '0')
    });
  } catch (error: any) {
    console.error('Get posts error:', error);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: error.response.data?.message || 'Failed to fetch posts'
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  }
});

// Get single post
router.get('/:siteId/:postId', authenticateToken, async (req: any, res) => {
  try {
    const { siteId, postId } = req.params;
    const userId = req.user.id;

    // Get site connection
    const site = await BlogSite.findOne({
      where: { id: siteId, userId, isActive: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Fetch post from WordPress
    const response = await axios.get(
      `${site.getApiBaseUrl()}/posts/${postId}`,
      {
        params: { context: 'edit' },
        headers: {
          'Authorization': site.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json({ post: response.data });
  } catch (error: any) {
    console.error('Get post error:', error);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: error.response.data?.message || 'Failed to fetch post'
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  }
});

// Update post
router.put('/:siteId/:postId', [
  authenticateToken,
  body('title').optional().trim().isLength({ min: 1 }),
  body('content').optional(),
  body('status').optional().isIn(['draft', 'publish', 'private'])
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { siteId, postId } = req.params;
    const { title, content, status, excerpt, featuredMedia } = req.body;
    const userId = req.user.id;

    // Get site connection
    const site = await BlogSite.findOne({
      where: { id: siteId, userId, isActive: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (featuredMedia !== undefined) updateData.featured_media = featuredMedia;

    // Update post in WordPress
    const response = await axios.post(
      `${site.getApiBaseUrl()}/posts/${postId}`,
      updateData,
      {
        headers: {
          'Authorization': site.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    res.json({
      message: 'Post updated successfully',
      post: response.data
    });
  } catch (error: any) {
    console.error('Update post error:', error);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: error.response.data?.message || 'Failed to update post'
      });
    } else {
      res.status(500).json({ error: 'Failed to update post' });
    }
  }
});

// Delete post
router.delete('/:siteId/:postId', authenticateToken, async (req: any, res) => {
  try {
    const { siteId, postId } = req.params;
    const { force = false } = req.query;
    const userId = req.user.id;

    // Get site connection
    const site = await BlogSite.findOne({
      where: { id: siteId, userId, isActive: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Delete post from WordPress
    const response = await axios.delete(
      `${site.getApiBaseUrl()}/posts/${postId}`,
      {
        params: { force },
        headers: {
          'Authorization': site.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json({
      message: force ? 'Post deleted permanently' : 'Post moved to trash',
      post: response.data
    });
  } catch (error: any) {
    console.error('Delete post error:', error);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: error.response.data?.message || 'Failed to delete post'
      });
    } else {
      res.status(500).json({ error: 'Failed to delete post' });
    }
  }
});

export default router;