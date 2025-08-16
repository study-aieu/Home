const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, handleValidationError } = require('../middleware/errorHandler');
const { requireOwnership } = require('../middleware/auth');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(',');
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * @route   POST /api/images/upload
 * @desc    Upload a new image
 * @access  Private
 */
router.post('/upload', upload.single('image'), [
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('postId')
    .optional()
    .isString()
    .withMessage('Post ID must be a string')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No image file provided',
      code: 'NO_IMAGE_FILE'
    });
  }

  const { title, description, tags = [], postId } = req.body;
  const file = req.file;

  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}_${randomString}${extension}`;
    
    // Create upload directory if it doesn't exist
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const fullUploadDir = path.join(uploadDir, 'images');
    await fs.mkdir(fullUploadDir, { recursive: true });

    // Process image with sharp
    const imageBuffer = file.buffer;
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Save original image
    const originalPath = path.join(fullUploadDir, filename);
    await image.toFile(originalPath);

    // Generate thumbnail
    const thumbnailFilename = `thumb_${filename}`;
    const thumbnailPath = path.join(fullUploadDir, thumbnailFilename);
    
    await sharp(imageBuffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Generate medium size for web
    const mediumFilename = `medium_${filename}`;
    const mediumPath = path.join(fullUploadDir, mediumFilename);
    
    await sharp(imageBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(mediumPath);

    // Create image record in database
    const imageRecord = await prisma.image.create({
      data: {
        userId: req.user.id,
        postId: postId || null,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        width: metadata.width,
        height: metadata.height,
        url: `/uploads/images/${filename}`,
        thumbnail: `/uploads/images/${thumbnailFilename}`,
        metadata: {
          title: title?.trim() || null,
          description: description?.trim() || null,
          tags: tags.map(tag => tag.trim()).filter(Boolean),
          originalSize: file.size,
          dimensions: {
            width: metadata.width,
            height: metadata.height
          },
          formats: {
            original: filename,
            thumbnail: thumbnailFilename,
            medium: mediumFilename
          }
        }
      },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        url: true,
        thumbnail: true,
        metadata: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: { image: imageRecord }
    });
  } catch (error) {
    console.error('Image upload failed:', error);
    
    // Clean up any files that might have been created
    try {
      const uploadDir = process.env.UPLOAD_PATH || './uploads';
      const fullUploadDir = path.join(uploadDir, 'images');
      
      if (req.file) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(req.file.originalname);
        const filename = `${timestamp}_${randomString}${extension}`;
        
        await fs.unlink(path.join(fullUploadDir, filename)).catch(() => {});
        await fs.unlink(path.join(fullUploadDir, `thumb_${filename}`)).catch(() => {});
        await fs.unlink(path.join(fullUploadDir, `medium_${filename}`)).catch(() => {});
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup files after upload error:', cleanupError);
    }

    res.status(500).json({
      success: false,
      error: 'Image upload failed',
      message: error.message
    });
  }
}));

/**
 * @route   GET /api/images
 * @desc    Get user's images
 * @access  Private
 */
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('postId')
    .optional()
    .isString()
    .withMessage('Post ID must be a string'),
  query('search')
    .optional()
    .isString()
    .withMessage('Search term must be a string'),
  query('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { page = 1, limit = 50, postId, search, tags } = req.query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    userId: req.user.id
  };

  if (postId) {
    where.postId = postId;
  }

  if (search) {
    where.OR = [
      { originalName: { contains: search, mode: 'insensitive' } },
      { metadata: { path: ['title'], string_contains: search, mode: 'insensitive' } },
      { metadata: { path: ['description'], string_contains: search, mode: 'insensitive' } }
    ];
  }

  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim());
    where.metadata = {
      path: ['tags'],
      array_contains: tagArray
    };
  }

  // Get images with pagination
  const [images, total] = await Promise.all([
    prisma.image.findMany({
      where,
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        url: true,
        thumbnail: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        post: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.image.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      images,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    }
  });
}));

/**
 * @route   GET /api/images/:id
 * @desc    Get image by ID
 * @access  Private
 */
router.get('/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Image ID is required')
], requireOwnership('image'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  const image = await prisma.image.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      width: true,
      height: true,
      url: true,
      thumbnail: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      post: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  if (!image) {
    return res.status(404).json({
      success: false,
      error: 'Image not found',
      code: 'IMAGE_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { image }
  });
}));

/**
 * @route   PUT /api/images/:id
 * @desc    Update image metadata
 * @access  Private
 */
router.put('/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Image ID is required'),
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
], requireOwnership('image'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;
  const { title, description, tags } = req.body;

  // Get current image
  const currentImage = await prisma.image.findUnique({
    where: { id }
  });

  if (!currentImage) {
    return res.status(404).json({
      success: false,
      error: 'Image not found',
      code: 'IMAGE_NOT_FOUND'
    });
  }

  // Update metadata
  const updatedMetadata = {
    ...currentImage.metadata,
    title: title?.trim() || currentImage.metadata?.title,
    description: description?.trim() || currentImage.metadata?.description,
    tags: tags?.map(tag => tag.trim()).filter(Boolean) || currentImage.metadata?.tags || []
  };

  const updatedImage = await prisma.image.update({
    where: { id },
    data: {
      metadata: updatedMetadata
    },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      width: true,
      height: true,
      url: true,
      thumbnail: true,
      metadata: true,
      createdAt: true,
      updatedAt: true
    }
  });

  res.json({
    success: true,
    message: 'Image updated successfully',
    data: { image: updatedImage }
  });
}));

/**
 * @route   DELETE /api/images/:id
 * @desc    Delete image
 * @access  Private
 */
router.delete('/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Image ID is required')
], requireOwnership('image'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  // Get image details
  const image = await prisma.image.findUnique({
    where: { id }
  });

  if (!image) {
    return res.status(404).json({
      success: false,
      error: 'Image not found',
      code: 'IMAGE_NOT_FOUND'
    });
  }

  try {
    // Delete image files
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const fullUploadDir = path.join(uploadDir, 'images');
    
    const filesToDelete = [
      path.join(fullUploadDir, image.filename),
      path.join(fullUploadDir, `thumb_${image.filename}`),
      path.join(fullUploadDir, `medium_${image.filename}`)
    ];

    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`Failed to delete file ${filePath}:`, error);
      }
    }

    // Delete database record
    await prisma.image.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete image:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete image',
      message: error.message
    });
  }
}));

/**
 * @route   POST /api/images/:id/reprocess
 * @desc    Reprocess image (regenerate thumbnails, etc.)
 * @access  Private
 */
router.post('/:id/reprocess', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Image ID is required')
], requireOwnership('image'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  // Get image details
  const image = await prisma.image.findUnique({
    where: { id }
  });

  if (!image) {
    return res.status(404).json({
      success: false,
      error: 'Image not found',
      code: 'IMAGE_NOT_FOUND'
    });
  }

  try {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const fullUploadDir = path.join(uploadDir, 'images');
    const originalPath = path.join(fullUploadDir, image.filename);

    // Check if original file exists
    try {
      await fs.access(originalPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Original image file not found',
        code: 'ORIGINAL_FILE_NOT_FOUND'
      });
    }

    // Read original image
    const imageBuffer = await fs.readFile(originalPath);
    const sharpImage = sharp(imageBuffer);

    // Regenerate thumbnail
    const thumbnailFilename = `thumb_${image.filename}`;
    const thumbnailPath = path.join(fullUploadDir, thumbnailFilename);
    
    await sharpImage
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Regenerate medium size
    const mediumFilename = `medium_${image.filename}`;
    const mediumPath = path.join(fullUploadDir, mediumFilename);
    
    await sharpImage
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(mediumPath);

    res.json({
      success: true,
      message: 'Image reprocessed successfully',
      data: { 
        reprocessed: true,
        files: {
          original: image.filename,
          thumbnail: thumbnailFilename,
          medium: mediumFilename
        }
      }
    });
  } catch (error) {
    console.error('Failed to reprocess image:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to reprocess image',
      message: error.message
    });
  }
}));

/**
 * @route   GET /api/images/stats/summary
 * @desc    Get image statistics summary
 * @access  Private
 */
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const [totalImages, totalSize, imageTypes] = await Promise.all([
    prisma.image.count({ where: { userId: req.user.id } }),
    prisma.image.aggregate({
      where: { userId: req.user.id },
      _sum: { size: true }
    }),
    prisma.image.groupBy({
      by: ['mimeType'],
      where: { userId: req.user.id },
      _count: { mimeType: true }
    })
  ]);

  const totalSizeInMB = Math.round((totalSize._sum.size || 0) / (1024 * 1024) * 100) / 100;

  res.json({
    success: true,
    data: {
      summary: {
        total: totalImages,
        totalSize: totalSizeInMB,
        totalSizeBytes: totalSize._sum.size || 0,
        types: imageTypes.map(type => ({
          mimeType: type.mimeType,
          count: type._count.mimeType
        }))
      }
    }
  });
}));

module.exports = router;