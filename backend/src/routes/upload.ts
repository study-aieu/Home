import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import BlogSite from '../models/BlogSite';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload image to WordPress media library
router.post('/:siteId', [authenticateToken, upload.single('image')], async (req: any, res) => {
  let tempFilePath: string | null = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { siteId } = req.params;
    const { alt_text, caption, description } = req.body;
    const userId = req.user.id;

    tempFilePath = req.file.path;

    // Get site connection
    const site = await BlogSite.findOne({
      where: { id: siteId, userId, isActive: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Prepare form data for WordPress
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFilePath!), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    if (alt_text) formData.append('alt_text', alt_text);
    if (caption) formData.append('caption', caption);
    if (description) formData.append('description', description);

    // Upload to WordPress media library
    const response = await axios.post(
      `${site.getApiBaseUrl()}/media`,
      formData,
      {
        headers: {
          'Authorization': site.getAuthHeader(),
          ...formData.getHeaders()
        },
        timeout: 30000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    res.status(201).json({
      message: 'Image uploaded successfully',
      media: response.data
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: error.response.data?.message || 'Failed to upload image'
      });
    } else {
      res.status(500).json({ error: 'Failed to upload image' });
    }
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
});

// Get media library items
router.get('/:siteId/media', authenticateToken, async (req: any, res) => {
  try {
    const { siteId } = req.params;
    const { page = 1, perPage = 20, mediaType = 'image' } = req.query;
    const userId = req.user.id;

    // Get site connection
    const site = await BlogSite.findOne({
      where: { id: siteId, userId, isActive: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Fetch media from WordPress
    const response = await axios.get(
      `${site.getApiBaseUrl()}/media`,
      {
        params: {
          page,
          per_page: perPage,
          media_type: mediaType,
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
      media: response.data,
      totalPages: parseInt(response.headers['x-wp-totalpages'] || '1'),
      total: parseInt(response.headers['x-wp-total'] || '0')
    });
  } catch (error: any) {
    console.error('Get media error:', error);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: error.response.data?.message || 'Failed to fetch media'
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch media' });
    }
  }
});

// Delete media item
router.delete('/:siteId/media/:mediaId', authenticateToken, async (req: any, res) => {
  try {
    const { siteId, mediaId } = req.params;
    const { force = true } = req.query;
    const userId = req.user.id;

    // Get site connection
    const site = await BlogSite.findOne({
      where: { id: siteId, userId, isActive: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Delete media from WordPress
    const response = await axios.delete(
      `${site.getApiBaseUrl()}/media/${mediaId}`,
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
      message: 'Media deleted successfully',
      media: response.data
    });
  } catch (error: any) {
    console.error('Delete media error:', error);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: error.response.data?.message || 'Failed to delete media'
      });
    } else {
      res.status(500).json({ error: 'Failed to delete media' });
    }
  }
});

export default router;