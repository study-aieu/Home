const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, handleValidationError } = require('../middleware/errorHandler');
const { requireOwnership } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/drafts
 * @desc    Get user's drafts
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
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  query('search')
    .optional()
    .isString()
    .withMessage('Search term must be a string'),
  query('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),
  query('categories')
    .optional()
    .isString()
    .withMessage('Categories must be a comma-separated string')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { page = 1, limit = 50, status, search, tags, categories } = req.query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    userId: req.user.id
  };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim());
    where.tags = {
      hasSome: tagArray
    };
  }

  if (categories) {
    const categoryArray = categories.split(',').map(cat => cat.trim());
    where.categories = {
      hasSome: categoryArray
    };
  }

  // Get drafts with pagination
  const [drafts, total] = await Promise.all([
    prisma.draft.findMany({
      where,
      select: {
        id: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        tags: true,
        categories: true,
        status: true,
        scheduledAt: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.draft.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      drafts: drafts.map(draft => ({
        ...draft,
        publishedCount: draft._count.posts
      })),
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
 * @route   POST /api/drafts
 * @desc    Create a new draft
 * @access  Private
 */
router.post('/', [
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  body('content')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content is required'),
  body('excerpt')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt must be less than 500 characters'),
  body('featuredImage')
    .optional()
    .isString()
    .withMessage('Featured image must be a string'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO date'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const {
    title,
    content,
    excerpt,
    featuredImage,
    tags = [],
    categories = [],
    scheduledAt,
    isPublic = false
  } = req.body;

  // Validate tags and categories
  if (tags.length > 20) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 20 tags allowed',
      code: 'TOO_MANY_TAGS'
    });
  }

  if (categories.length > 10) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 10 categories allowed',
      code: 'TOO_MANY_CATEGORIES'
    });
  }

  // Create draft
  const draft = await prisma.draft.create({
    data: {
      userId: req.user.id,
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt?.trim() || null,
      featuredImage: featuredImage || null,
      tags: tags.map(tag => tag.trim()).filter(Boolean),
      categories: categories.map(cat => cat.trim()).filter(Boolean),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      isPublic,
      status: 'draft'
    },
    select: {
      id: true,
      title: true,
      excerpt: true,
      featuredImage: true,
      tags: true,
      categories: true,
      status: true,
      scheduledAt: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true
    }
  });

  res.status(201).json({
    success: true,
    message: 'Draft created successfully',
    data: { draft }
  });
}));

/**
 * @route   GET /api/drafts/:id
 * @desc    Get draft by ID
 * @access  Private
 */
router.get('/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Draft ID is required')
], requireOwnership('draft'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  const draft = await prisma.draft.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      featuredImage: true,
      tags: true,
      categories: true,
      status: true,
      scheduledAt: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
      posts: {
        select: {
          id: true,
          connection: {
            select: {
              id: true,
              name: true,
              provider: {
                select: {
                  name: true,
                  displayName: true,
                  logo: true
                }
              }
            }
          },
          status: true,
          publishedAt: true,
          lastSynced: true,
          syncStatus: true
        }
      }
    }
  });

  if (!draft) {
    return res.status(404).json({
      success: false,
      error: 'Draft not found',
      code: 'DRAFT_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { draft }
  });
}));

/**
 * @route   PUT /api/drafts/:id
 * @desc    Update draft
 * @access  Private
 */
router.put('/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Draft ID is required'),
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  body('content')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content must not be empty'),
  body('excerpt')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt must be less than 500 characters'),
  body('featuredImage')
    .optional()
    .isString()
    .withMessage('Featured image must be a string'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO date'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status')
], requireOwnership('draft'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;
  const {
    title,
    content,
    excerpt,
    featuredImage,
    tags,
    categories,
    scheduledAt,
    isPublic,
    status
  } = req.body;

  // Validate tags and categories if provided
  if (tags && tags.length > 20) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 20 tags allowed',
      code: 'TOO_MANY_TAGS'
    });
  }

  if (categories && categories.length > 10) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 10 categories allowed',
      code: 'TOO_MANY_CATEGORIES'
    });
  }

  // Prepare update data
  const updateData = {};
  
  if (title !== undefined) updateData.title = title.trim();
  if (content !== undefined) updateData.content = content.trim();
  if (excerpt !== undefined) updateData.excerpt = excerpt?.trim() || null;
  if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
  if (tags !== undefined) updateData.tags = tags.map(tag => tag.trim()).filter(Boolean);
  if (categories !== undefined) updateData.categories = categories.map(cat => cat.trim()).filter(Boolean);
  if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
  if (isPublic !== undefined) updateData.isPublic = isPublic;
  if (status !== undefined) updateData.status = status;

  // Update draft
  const updatedDraft = await prisma.draft.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      title: true,
      excerpt: true,
      featuredImage: true,
      tags: true,
      categories: true,
      status: true,
      scheduledAt: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true
    }
  });

  res.json({
    success: true,
    message: 'Draft updated successfully',
    data: { draft: updatedDraft }
  });
}));

/**
 * @route   DELETE /api/drafts/:id
 * @desc    Delete draft
 * @access  Private
 */
router.delete('/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Draft ID is required')
], requireOwnership('draft'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  // Check if draft has published posts
  const postCount = await prisma.post.count({
    where: { draftId: id }
  });

  if (postCount > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete draft with published posts',
      code: 'DRAFT_HAS_POSTS'
    });
  }

  // Delete draft
  await prisma.draft.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Draft deleted successfully'
  });
}));

/**
 * @route   POST /api/drafts/:id/duplicate
 * @desc    Duplicate draft
 * @access  Private
 */
router.post('/:id/duplicate', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Draft ID is required')
], requireOwnership('draft'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  // Get original draft
  const originalDraft = await prisma.draft.findUnique({
    where: { id }
  });

  if (!originalDraft) {
    return res.status(404).json({
      success: false,
      error: 'Draft not found',
      code: 'DRAFT_NOT_FOUND'
    });
  }

  // Create duplicate draft
  const duplicatedDraft = await prisma.draft.create({
    data: {
      userId: req.user.id,
      title: `${originalDraft.title} (Copy)`,
      content: originalDraft.content,
      excerpt: originalDraft.excerpt,
      featuredImage: originalDraft.featuredImage,
      tags: originalDraft.tags,
      categories: originalDraft.categories,
      status: 'draft',
      scheduledAt: null,
      isPublic: false
    },
    select: {
      id: true,
      title: true,
      excerpt: true,
      featuredImage: true,
      tags: true,
      categories: true,
      status: true,
      scheduledAt: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true
    }
  });

  res.status(201).json({
    success: true,
    message: 'Draft duplicated successfully',
    data: { draft: duplicatedDraft }
  });
}));

/**
 * @route   GET /api/drafts/stats/summary
 * @desc    Get draft statistics summary
 * @access  Private
 */
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const [totalDrafts, publishedDrafts, archivedDrafts, scheduledDrafts] = await Promise.all([
    prisma.draft.count({ where: { userId: req.user.id } }),
    prisma.draft.count({ where: { userId: req.user.id, status: 'published' } }),
    prisma.draft.count({ where: { userId: req.user.id, status: 'archived' } }),
    prisma.draft.count({ 
      where: { 
        userId: req.user.id, 
        scheduledAt: { not: null },
        status: 'draft'
      } 
    })
  ]);

  const activeDrafts = totalDrafts - publishedDrafts - archivedDrafts;

  res.json({
    success: true,
    data: {
      summary: {
        total: totalDrafts,
        active: activeDrafts,
        published: publishedDrafts,
        archived: archivedDrafts,
        scheduled: scheduledDrafts
      }
    }
  });
}));

module.exports = router;