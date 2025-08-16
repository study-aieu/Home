const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, handleValidationError } = require('../middleware/errorHandler');
const { requireOwnership } = require('../middleware/auth');
const { 
  createProviderPost, 
  updateProviderPost, 
  deleteProviderPost,
  getProviderPosts 
} = require('../services/providerService');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   POST /api/publish
 * @desc    Publish draft to one or more platforms
 * @access  Private
 */
router.post('/', [
  body('draftId')
    .isString()
    .notEmpty()
    .withMessage('Draft ID is required'),
  body('connections')
    .isArray({ min: 1 })
    .withMessage('At least one connection is required'),
  body('connections.*.connectionId')
    .isString()
    .notEmpty()
    .withMessage('Connection ID is required'),
  body('connections.*.customFields')
    .optional()
    .isObject()
    .withMessage('Custom fields must be an object'),
  body('publishOptions')
    .optional()
    .isObject()
    .withMessage('Publish options must be an object')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { draftId, connections, publishOptions = {} } = req.body;

  // Verify draft exists and belongs to user
  const draft = await prisma.draft.findUnique({
    where: { id: draftId, userId: req.user.id },
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      featuredImage: true,
      tags: true,
      categories: true,
      scheduledAt: true
    }
  });

  if (!draft) {
    return res.status(404).json({
      success: false,
      error: 'Draft not found',
      code: 'DRAFT_NOT_FOUND'
    });
  }

  // Verify all connections exist and belong to user
  const connectionIds = connections.map(c => c.connectionId);
  const userConnections = await prisma.connection.findMany({
    where: {
      id: { in: connectionIds },
      userId: req.user.id,
      isActive: true
    },
    include: {
      provider: true
    }
  });

  if (userConnections.length !== connectionIds.length) {
    return res.status(400).json({
      success: false,
      error: 'One or more connections not found or inactive',
      code: 'INVALID_CONNECTIONS'
    });
  }

  // Create publish job
  const publishJob = await prisma.publishJob.create({
    data: {
      userId: req.user.id,
      draftId,
      status: 'processing',
      totalTargets: connections.length,
      startedAt: new Date()
    }
  });

  // Prepare post data
  const postData = {
    title: draft.title,
    content: draft.content,
    excerpt: draft.excerpt,
    featuredImage: draft.featuredImage,
    tags: draft.tags,
    categories: draft.categories,
    status: publishOptions.status || 'published',
    scheduledAt: draft.scheduledAt || publishOptions.scheduledAt,
    customFields: publishOptions.customFields || {}
  };

  const results = {};
  let completed = 0;
  let failed = 0;

  // Publish to each connection
  for (const connection of connections) {
    try {
      const userConnection = userConnections.find(c => c.id === connection.connectionId);
      
      // Check if post already exists for this connection
      const existingPost = await prisma.post.findFirst({
        where: {
          draftId,
          connectionId: connection.connectionId
        }
      });

      let publishResult;
      
      if (existingPost) {
        // Update existing post
        publishResult = await updateProviderPost(
          userConnection.provider.name,
          userConnection.credentials,
          existingPost.externalId,
          postData
        );
      } else {
        // Create new post
        publishResult = await createProviderPost(
          userConnection.provider.name,
          userConnection.credentials,
          postData
        );
      }

      if (publishResult.success) {
        // Save or update post record
        const postData = {
          userId: req.user.id,
          draftId,
          connectionId: connection.connectionId,
          externalId: publishResult.externalId,
          title: draft.title,
          content: draft.content,
          excerpt: draft.excerpt,
          featuredImage: draft.featuredImage,
          tags: draft.tags,
          categories: draft.categories,
          status: publishResult.metadata?.status || 'published',
          publishedAt: new Date(),
          syncStatus: 'synced',
          metadata: publishResult.metadata
        };

        if (existingPost) {
          await prisma.post.update({
            where: { id: existingPost.id },
            data: postData
          });
        } else {
          await prisma.post.create({
            data: postData
          });
        }

        results[connection.connectionId] = {
          success: true,
          message: publishResult.message,
          url: publishResult.url,
          externalId: publishResult.externalId
        };
        
        completed++;
      } else {
        results[connection.connectionId] = {
          success: false,
          error: publishResult.error,
          message: publishResult.message
        };
        
        failed++;
      }
    } catch (error) {
      console.error(`Failed to publish to connection ${connection.connectionId}:`, error);
      
      results[connection.connectionId] = {
        success: false,
        error: error.message,
        message: 'Publishing failed due to an unexpected error'
      };
      
      failed++;
    }
  }

  // Update publish job
  const finalStatus = failed === 0 ? 'completed' : (completed === 0 ? 'failed' : 'completed');
  
  await prisma.publishJob.update({
    where: { id: publishJob.id },
    data: {
      status: finalStatus,
      progress: 100,
      completed,
      failed,
      results,
      completedAt: new Date()
    }
  });

  // Update draft status if all publishes succeeded
  if (failed === 0 && publishOptions.updateDraftStatus) {
    await prisma.draft.update({
      where: { id: draftId },
      data: { status: 'published' }
    });
  }

  res.json({
    success: true,
    message: `Publishing ${completed > 0 ? 'completed' : 'failed'} for ${completed} out of ${connections.length} platforms`,
    data: {
      jobId: publishJob.id,
      results,
      summary: {
        total: connections.length,
        completed,
        failed,
        status: finalStatus
      }
    }
  });
}));

/**
 * @route   GET /api/publish/jobs
 * @desc    Get user's publish jobs
 * @access  Private
 */
router.get('/jobs', [
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
    .isIn(['pending', 'processing', 'completed', 'failed'])
    .withMessage('Invalid status')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { page = 1, limit = 50, status } = req.query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    userId: req.user.id
  };

  if (status) {
    where.status = status;
  }

  // Get publish jobs with pagination
  const [jobs, total] = await Promise.all([
    prisma.publishJob.findMany({
      where,
      select: {
        id: true,
        status: true,
        progress: true,
        totalTargets: true,
        completed: true,
        failed: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        draft: {
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
    prisma.publishJob.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      jobs,
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
 * @route   GET /api/publish/jobs/:id
 * @desc    Get publish job details
 * @access  Private
 */
router.get('/jobs/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Job ID is required')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  const job = await prisma.publishJob.findUnique({
    where: { id, userId: req.user.id },
    select: {
      id: true,
      status: true,
      progress: true,
      totalTargets: true,
      completed: true,
      failed: true,
      results: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      draft: {
        select: {
          id: true,
          title: true,
          content: true
        }
      }
    }
  });

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Publish job not found',
      code: 'JOB_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { job }
  });
}));

/**
 * @route   GET /api/publish/posts
 * @desc    Get user's published posts
 * @access  Private
 */
router.get('/posts', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('connectionId')
    .optional()
    .isString()
    .withMessage('Connection ID must be a string'),
  query('status')
    .optional()
    .isIn(['published', 'draft', 'private', 'deleted'])
    .withMessage('Invalid status'),
  query('syncStatus')
    .optional()
    .isIn(['synced', 'pending', 'failed', 'deleted'])
    .withMessage('Invalid sync status')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { page = 1, limit = 50, connectionId, status, syncStatus } = req.query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    userId: req.user.id
  };

  if (connectionId) {
    where.connectionId = connectionId;
  }

  if (status) {
    where.status = status;
  }

  if (syncStatus) {
    where.syncStatus = syncStatus;
  }

  // Get posts with pagination
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        tags: true,
        categories: true,
        status: true,
        publishedAt: true,
        lastSynced: true,
        syncStatus: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
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
        draft: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.post.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      posts,
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
 * @route   PUT /api/publish/posts/:id
 * @desc    Update published post
 * @access  Private
 */
router.put('/posts/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Post ID is required'),
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
  body('status')
    .optional()
    .isIn(['published', 'draft', 'private'])
    .withMessage('Invalid status')
], requireOwnership('post'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;
  const updateData = req.body;

  // Get post with connection details
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      connection: {
        include: {
          provider: true
        }
      }
    }
  });

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found',
      code: 'POST_NOT_FOUND'
    });
  }

  // Update post on the provider
  const providerUpdateData = {
    title: updateData.title || post.title,
    content: updateData.content || post.content,
    excerpt: updateData.excerpt !== undefined ? updateData.excerpt : post.excerpt,
    featuredImage: updateData.featuredImage !== undefined ? updateData.featuredImage : post.featuredImage,
    tags: updateData.tags || post.tags,
    categories: updateData.categories || post.categories,
    status: updateData.status || post.status
  };

  try {
    const updateResult = await updateProviderPost(
      post.connection.provider.name,
      post.connection.credentials,
      post.externalId,
      providerUpdateData
    );

    if (updateResult.success) {
      // Update local post record
      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          title: providerUpdateData.title,
          content: providerUpdateData.content,
          excerpt: providerUpdateData.excerpt,
          featuredImage: providerUpdateData.featuredImage,
          tags: providerUpdateData.tags,
          categories: providerUpdateData.categories,
          status: providerUpdateData.status,
          lastSynced: new Date(),
          syncStatus: 'synced',
          metadata: {
            ...post.metadata,
            ...updateResult.metadata
          }
        },
        select: {
          id: true,
          title: true,
          excerpt: true,
          featuredImage: true,
          tags: true,
          categories: true,
          status: true,
          publishedAt: true,
          lastSynced: true,
          syncStatus: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        message: 'Post updated successfully',
        data: { post: updatedPost }
      });
    } else {
      res.status(400).json({
        success: false,
        error: updateResult.error,
        message: updateResult.message
      });
    }
  } catch (error) {
    console.error('Failed to update post on provider:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to update post on provider'
    });
  }
}));

/**
 * @route   DELETE /api/publish/posts/:id
 * @desc    Delete published post
 * @access  Private
 */
router.delete('/posts/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Post ID is required')
], requireOwnership('post'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  // Get post with connection details
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      connection: {
        include: {
          provider: true
        }
      }
    }
  });

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found',
      code: 'POST_NOT_FOUND'
    });
  }

  try {
    // Delete post from provider
    const deleteResult = await deleteProviderPost(
      post.connection.provider.name,
      post.connection.credentials,
      post.externalId
    );

    if (deleteResult.ok) {
      // Delete local post record
      await prisma.post.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Post deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: deleteResult.message,
        message: 'Failed to delete post from provider'
      });
    }
  } catch (error) {
    console.error('Failed to delete post from provider:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to delete post from provider'
    });
  }
}));

/**
 * @route   POST /api/publish/posts/:id/sync
 * @desc    Sync post with provider
 * @access  Private
 */
router.post('/posts/:id/sync', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Post ID is required')
], requireOwnership('post'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  // Get post with connection details
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      connection: {
        include: {
          provider: true
        }
      }
    }
  });

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found',
      code: 'POST_NOT_FOUND'
    });
  }

  try {
    // Get post from provider
    const providerPosts = await getProviderPosts(
      post.connection.provider.name,
      post.connection.credentials,
      { page: 1, limit: 100 }
    );

    const providerPost = providerPosts.find(p => p.id === post.externalId);

    if (providerPost) {
      // Update local post record
      await prisma.post.update({
        where: { id },
        data: {
          title: providerPost.title,
          content: providerPost.content,
          excerpt: providerPost.excerpt,
          featuredImage: providerPost.featuredImage,
          tags: providerPost.tags,
          categories: providerPost.categories,
          status: providerPost.status,
          lastSynced: new Date(),
          syncStatus: 'synced'
        }
      });

      res.json({
        success: true,
        message: 'Post synced successfully',
        data: { synced: true }
      });
    } else {
      // Mark as failed sync
      await prisma.post.update({
        where: { id },
        data: {
          syncStatus: 'failed',
          errorMessage: 'Post not found on provider',
          lastSynced: new Date()
        }
      });

      res.json({
        success: false,
        error: 'Post not found on provider',
        message: 'Post sync failed'
      });
    }
  } catch (error) {
    console.error('Failed to sync post:', error);
    
    // Mark as failed sync
    await prisma.post.update({
      where: { id },
      data: {
        syncStatus: 'failed',
        errorMessage: error.message,
        lastSynced: new Date()
      }
    });

    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to sync post'
    });
  }
}));

module.exports = router;