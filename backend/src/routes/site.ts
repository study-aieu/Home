import express from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';
import BlogSite from '../models/BlogSite';

const router = express.Router();

// Test WordPress connection
const testWordPressConnection = async (url: string, username: string, password: string) => {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    const apiUrl = `${cleanUrl}/wp-json/wp/v2/users/me`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.status === 200;
  } catch (error) {
    console.error('WordPress connection test failed:', error);
    return false;
  }
};

// Connect to WordPress site
router.post('/connect', [
  authenticateToken,
  body('name').trim().isLength({ min: 1 }),
  body('url').isURL(),
  body('username').trim().isLength({ min: 1 }),
  body('applicationPassword').trim().isLength({ min: 1 })
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, url, username, applicationPassword } = req.body;
    const userId = req.user.id;

    // Test the connection
    const isConnected = await testWordPressConnection(url, username, applicationPassword);
    if (!isConnected) {
      return res.status(400).json({ error: 'Failed to connect to WordPress site. Please check your credentials.' });
    }

    // Check if site already exists for this user
    const existingSite = await BlogSite.findOne({
      where: { userId, url }
    });

    if (existingSite) {
      // Update existing site
      await existingSite.update({
        name,
        username,
        applicationPassword,
        isActive: true
      });
      
      res.json({
        message: 'Site connection updated successfully',
        site: existingSite.toJSON()
      });
    } else {
      // Create new site connection
      const site = await BlogSite.create({
        userId,
        name,
        url,
        username,
        applicationPassword
      });

      res.status(201).json({
        message: 'Site connected successfully',
        site: site.toJSON()
      });
    }
  } catch (error) {
    console.error('Site connection error:', error);
    res.status(500).json({ error: 'Failed to connect site' });
  }
});

// Get connected sites
router.get('/sites', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    const sites = await BlogSite.findAll({
      where: { userId, isActive: true },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      sites: sites.map(site => site.toJSON())
    });
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// Test connection to a site
router.post('/test/:siteId', authenticateToken, async (req: any, res) => {
  try {
    const { siteId } = req.params;
    const userId = req.user.id;

    const site = await BlogSite.findOne({
      where: { id: siteId, userId }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const isConnected = await testWordPressConnection(
      site.url,
      site.username,
      site.applicationPassword
    );

    res.json({
      connected: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed'
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Delete site connection
router.delete('/sites/:siteId', authenticateToken, async (req: any, res) => {
  try {
    const { siteId } = req.params;
    const userId = req.user.id;

    const site = await BlogSite.findOne({
      where: { id: siteId, userId }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    await site.update({ isActive: false });

    res.json({ message: 'Site disconnected successfully' });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({ error: 'Failed to disconnect site' });
  }
});

export default router;