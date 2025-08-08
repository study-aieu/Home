const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const database = require('../config/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

class UploadController {
  // Configure multer middleware
  getUploadMiddleware() {
    return upload.single('image');
  }

  // Upload image to WordPress media library
  async uploadToWordPress(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

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

      // Read the uploaded file
      const imageBuffer = fs.readFileSync(req.file.path);
      
      // Create form data for WordPress
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      // Upload to WordPress
      const auth = Buffer.from(`${site.username}:${site.app_password}`).toString('base64');
      
      const response = await axios.post(
        `${site.site_url}/wp-json/wp/v2/media`,
        formData,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            ...formData.getHeaders()
          },
          timeout: 30000 // 30 seconds for file upload
        }
      );

      // Clean up temporary file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          mediaId: response.data.id,
          url: response.data.source_url,
          alt: response.data.alt_text,
          caption: response.data.caption?.rendered || '',
          sizes: response.data.media_details?.sizes || {}
        }
      });

    } catch (error) {
      console.error('Upload error:', error);

      // Clean up temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (error.response?.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'WordPress authentication failed'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to upload image'
      });
    }
  }

  // Upload image for local storage (temporary)
  async uploadLocal(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      // For local storage, we'll just return the file info
      // In a production app, you'd upload to a cloud service
      const fileUrl = `/uploads/temp/${req.file.filename}`;

      res.json({
        success: true,
        message: 'Image uploaded locally',
        data: {
          localPath: req.file.path,
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });

    } catch (error) {
      console.error('Local upload error:', error);
      
      // Clean up temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Failed to upload image locally'
      });
    }
  }

  // Get WordPress media library
  async getMediaLibrary(req, res) {
    try {
      const { userId } = req.user;
      const { siteId } = req.params;
      const { page = 1, per_page = 20 } = req.query;
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
        `${site.site_url}/wp-json/wp/v2/media`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          },
          params: {
            page,
            per_page,
            author: 'me'
          },
          timeout: 10000
        }
      );

      const media = response.data.map(item => ({
        id: item.id,
        title: item.title.rendered,
        url: item.source_url,
        alt: item.alt_text,
        caption: item.caption?.rendered || '',
        date: item.date,
        mime_type: item.mime_type,
        sizes: item.media_details?.sizes || {}
      }));

      res.json({
        success: true,
        data: {
          media,
          pagination: {
            page: parseInt(page),
            per_page: parseInt(per_page),
            total: parseInt(response.headers['x-wp-total'] || 0),
            total_pages: parseInt(response.headers['x-wp-totalpages'] || 0)
          }
        }
      });

    } catch (error) {
      console.error('Get media library error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch media library'
      });
    }
  }

  // Helper method to get site credentials
  async getSiteCredentials(userId, siteId, db) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT site_url, username, app_password FROM wordpress_sites WHERE id = ? AND user_id = ?',
        [siteId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
}

module.exports = new UploadController();