const express = require('express');
const multer = require('multer');
const { BlogSite } = require('../models');
const WordPressAPI = require('../utils/wordpress');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// @route   POST /api/wordpress/connect-site
// @desc    Connect to a WordPress site
// @access  Private
router.post('/connect-site', authMiddleware, async (req, res) => {
  try {
    const { name, url, username, applicationPassword } = req.body;

    // Validate required fields
    if (!name || !url || !username || !applicationPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Test connection to WordPress site
    const wpAPI = new WordPressAPI(url, username, applicationPassword);
    const connectionTest = await wpAPI.testConnection();

    if (!connectionTest.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to connect to WordPress site',
        error: connectionTest.error,
      });
    }

    // Check if site already exists for this user
    const existingSite = await BlogSite.findOne({
      where: {
        userId: req.user.id,
        url: url,
      },
    });

    if (existingSite) {
      // Update existing site
      await existingSite.update({
        name,
        username,
        applicationPassword,
        isActive: true,
      });

      return res.json({
        success: true,
        message: 'WordPress site updated successfully',
        data: {
          blogSite: existingSite,
          wordpressUser: connectionTest.user,
        },
      });
    } else {
      // Create new site connection
      const blogSite = await BlogSite.create({
        userId: req.user.id,
        name,
        url,
        username,
        applicationPassword,
        isActive: true,
      });

      return res.status(201).json({
        success: true,
        message: 'WordPress site connected successfully',
        data: {
          blogSite,
          wordpressUser: connectionTest.user,
        },
      });
    }
  } catch (error) {
    console.error('Connect site error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during site connection',
      error: error.message,
    });
  }
});

// @route   GET /api/wordpress/sites
// @desc    Get all connected WordPress sites for user
// @access  Private
router.get('/sites', authMiddleware, async (req, res) => {
  try {
    const blogSites = await BlogSite.findAll({
      where: {
        userId: req.user.id,
        isActive: true,
      },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        blogSites,
      },
    });
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/wordpress/posts/:siteId
// @desc    Get posts from a connected WordPress site
// @access  Private
router.get('/posts/:siteId', authMiddleware, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { page = 1, perPage = 10 } = req.query;

    // Get blog site
    const blogSite = await BlogSite.findOne({
      where: {
        id: siteId,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!blogSite) {
      return res.status(404).json({
        success: false,
        message: 'Blog site not found',
      });
    }

    // Get posts from WordPress
    const wpAPI = new WordPressAPI(
      blogSite.url,
      blogSite.username,
      blogSite.applicationPassword
    );

    const result = await wpAPI.getPosts(parseInt(page), parseInt(perPage));

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch posts',
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        posts: result.posts,
        pagination: {
          page: parseInt(page),
          perPage: parseInt(perPage),
          totalPages: result.totalPages,
          total: result.total,
        },
      },
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   POST /api/wordpress/posts/:siteId
// @desc    Create a new post on WordPress site
// @access  Private
router.post('/posts/:siteId', authMiddleware, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { title, content, status = 'publish', excerpt, featuredMediaId } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    // Get blog site
    const blogSite = await BlogSite.findOne({
      where: {
        id: siteId,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!blogSite) {
      return res.status(404).json({
        success: false,
        message: 'Blog site not found',
      });
    }

    // Create post on WordPress
    const wpAPI = new WordPressAPI(
      blogSite.url,
      blogSite.username,
      blogSite.applicationPassword
    );

    const result = await wpAPI.createPost({
      title,
      content,
      status,
      excerpt,
      featuredMediaId,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create post',
        error: result.error,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: {
        post: result.post,
      },
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/wordpress/posts/:siteId/:postId
// @desc    Update a post on WordPress site
// @access  Private
router.put('/posts/:siteId/:postId', authMiddleware, async (req, res) => {
  try {
    const { siteId, postId } = req.params;
    const { title, content, status, excerpt, featuredMediaId } = req.body;

    // Get blog site
    const blogSite = await BlogSite.findOne({
      where: {
        id: siteId,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!blogSite) {
      return res.status(404).json({
        success: false,
        message: 'Blog site not found',
      });
    }

    // Update post on WordPress
    const wpAPI = new WordPressAPI(
      blogSite.url,
      blogSite.username,
      blogSite.applicationPassword
    );

    const result = await wpAPI.updatePost(postId, {
      title,
      content,
      status,
      excerpt,
      featuredMediaId,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update post',
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: {
        post: result.post,
      },
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   DELETE /api/wordpress/posts/:siteId/:postId
// @desc    Delete a post on WordPress site
// @access  Private
router.delete('/posts/:siteId/:postId', authMiddleware, async (req, res) => {
  try {
    const { siteId, postId } = req.params;

    // Get blog site
    const blogSite = await BlogSite.findOne({
      where: {
        id: siteId,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!blogSite) {
      return res.status(404).json({
        success: false,
        message: 'Blog site not found',
      });
    }

    // Delete post on WordPress
    const wpAPI = new WordPressAPI(
      blogSite.url,
      blogSite.username,
      blogSite.applicationPassword
    );

    const result = await wpAPI.deletePost(postId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete post',
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Post deleted successfully',
      data: {
        post: result.post,
      },
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   POST /api/wordpress/upload-image/:siteId
// @desc    Upload image to WordPress media library
// @access  Private
router.post('/upload-image/:siteId', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { siteId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    // Get blog site
    const blogSite = await BlogSite.findOne({
      where: {
        id: siteId,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!blogSite) {
      return res.status(404).json({
        success: false,
        message: 'Blog site not found',
      });
    }

    // Upload image to WordPress
    const wpAPI = new WordPressAPI(
      blogSite.url,
      blogSite.username,
      blogSite.applicationPassword
    );

    const result = await wpAPI.uploadMedia(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to upload image',
        error: result.error,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        media: result.media,
      },
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;