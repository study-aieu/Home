import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, MultiPublishRequest, MultiPublishResult } from '../types';
import { ConnectionService } from '../services/connection';
import { getProvider } from '../providers';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const connectionService = new ConnectionService();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /publish
 * Publish a draft to a single connection
 */
router.post('/', [
  body('draftId').notEmpty().withMessage('Draft ID is required'),
  body('connectionId').notEmpty().withMessage('Connection ID is required'),
  body('publishAt').optional().isISO8601().withMessage('Publish date must be valid ISO8601 date')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = req.user!;
    const { draftId, connectionId, publishAt } = req.body;

    // Get the draft
    const draft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        userId: user.id
      }
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }

    // Get the connection
    const connection = await connectionService.getConnection(user.id, connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    // Get the provider
    const provider = getProvider(connection.providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Prepare publish input
    const publishInput = {
      title: draft.title,
      content: draft.content,
      excerpt: draft.excerpt,
      tags: draft.tags,
      categories: draft.categories,
      featuredImage: draft.featuredImage,
      publishedAt: publishAt ? new Date(publishAt) : new Date(),
      metadata: draft.metadata
    };

    // Publish to the provider
    const publishResult = await provider.createPost(connection.credentials, publishInput);

    if (!publishResult.success) {
      return res.status(400).json({
        success: false,
        error: `Publishing failed: ${publishResult.error}`
      });
    }

    // Save the post record
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        draftId: draft.id,
        connectionId: connection.id,
        externalId: publishResult.externalId,
        title: draft.title,
        content: draft.content,
        excerpt: draft.excerpt,
        tags: draft.tags,
        categories: draft.categories,
        featuredImage: draft.featuredImage,
        status: publishAt && new Date(publishAt) > new Date() ? 'SCHEDULED' : 'PUBLISHED',
        publishedAt: publishAt ? new Date(publishAt) : new Date(),
        metadata: {
          ...draft.metadata,
          publishResult: publishResult.metadata
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        post,
        publishResult
      },
      message: 'Post published successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /publish/multi
 * Publish a draft to multiple connections
 */
router.post('/multi', [
  body('draftId').notEmpty().withMessage('Draft ID is required'),
  body('connectionIds').isArray({ min: 1 }).withMessage('At least one connection ID is required'),
  body('publishAt').optional().isISO8601().withMessage('Publish date must be valid ISO8601 date')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = req.user!;
    const { draftId, connectionIds, publishAt }: MultiPublishRequest = req.body;

    // Get the draft
    const draft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        userId: user.id
      }
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }

    const results: MultiPublishResult['results'] = [];
    
    // Publish to each connection
    for (const connectionId of connectionIds) {
      try {
        // Get the connection
        const connection = await connectionService.getConnection(user.id, connectionId);
        if (!connection) {
          results.push({
            connectionId,
            success: false,
            error: 'Connection not found'
          });
          continue;
        }

        // Get the provider
        const provider = getProvider(connection.providerId);
        if (!provider) {
          results.push({
            connectionId,
            success: false,
            error: 'Provider not found'
          });
          continue;
        }

        // Prepare publish input
        const publishInput = {
          title: draft.title,
          content: draft.content,
          excerpt: draft.excerpt,
          tags: draft.tags,
          categories: draft.categories,
          featuredImage: draft.featuredImage,
          publishedAt: publishAt ? new Date(publishAt) : new Date(),
          metadata: draft.metadata
        };

        // Publish to the provider
        const publishResult = await provider.createPost(connection.credentials, publishInput);

        if (!publishResult.success) {
          results.push({
            connectionId,
            success: false,
            error: publishResult.error
          });
          continue;
        }

        // Save the post record
        const post = await prisma.post.create({
          data: {
            userId: user.id,
            draftId: draft.id,
            connectionId: connection.id,
            externalId: publishResult.externalId,
            title: draft.title,
            content: draft.content,
            excerpt: draft.excerpt,
            tags: draft.tags,
            categories: draft.categories,
            featuredImage: draft.featuredImage,
            status: publishAt && new Date(publishAt) > new Date() ? 'SCHEDULED' : 'PUBLISHED',
            publishedAt: publishAt ? new Date(publishAt) : new Date(),
            metadata: {
              ...draft.metadata,
              publishResult: publishResult.metadata
            }
          }
        });

        results.push({
          connectionId,
          success: true,
          postId: post.id,
          externalId: publishResult.externalId,
          url: publishResult.url
        });
      } catch (error) {
        results.push({
          connectionId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const multiPublishResult: MultiPublishResult = {
      draftId,
      results
    };

    res.status(201).json({
      success: true,
      data: multiPublishResult,
      message: `Multi-publish completed: ${successCount}/${connectionIds.length} successful`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /publish/:postId
 * Update a published post
 */
router.put('/:postId', [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('content').optional().trim().isLength({ min: 1 }),
  body('excerpt').optional().trim().isLength({ max: 500 }),
  body('tags').optional().isArray(),
  body('categories').optional().isArray(),
  body('featuredImage').optional().isURL()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = req.user!;
    const { postId } = req.params;

    // Get the post
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: user.id
      },
      include: {
        connection: true
      }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Get the provider
    const provider = getProvider(post.connection.providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Check if provider supports editing
    if (!provider.supports.edit) {
      return res.status(400).json({
        success: false,
        error: `${provider.name} does not support editing published posts`
      });
    }

    // Get connection credentials
    const connection = await connectionService.getConnection(user.id, post.connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    // Prepare update input
    const updateInput = {
      title: req.body.title || post.title,
      content: req.body.content || post.content,
      excerpt: req.body.excerpt || post.excerpt,
      tags: req.body.tags || post.tags,
      categories: req.body.categories || post.categories,
      featuredImage: req.body.featuredImage || post.featuredImage,
      metadata: post.metadata
    };

    // Update the post on the provider
    const updateResult = await provider.updatePost(
      connection.credentials,
      post.externalId!,
      updateInput
    );

    if (!updateResult.success) {
      return res.status(400).json({
        success: false,
        error: `Update failed: ${updateResult.error}`
      });
    }

    // Update the local post record
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title: updateInput.title,
        content: updateInput.content,
        excerpt: updateInput.excerpt,
        tags: updateInput.tags,
        categories: updateInput.categories,
        featuredImage: updateInput.featuredImage,
        metadata: {
          ...post.metadata,
          lastUpdate: new Date().toISOString(),
          updateResult: updateResult.metadata
        }
      }
    });

    res.json({
      success: true,
      data: {
        post: updatedPost,
        updateResult
      },
      message: 'Post updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /publish/:postId
 * Delete a published post
 */
router.delete('/:postId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { postId } = req.params;

    // Get the post
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: user.id
      },
      include: {
        connection: true
      }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Get the provider
    const provider = getProvider(post.connection.providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Check if provider supports deletion
    if (!provider.supports.delete) {
      return res.status(400).json({
        success: false,
        error: `${provider.name} does not support deleting published posts`
      });
    }

    // Get connection credentials
    const connection = await connectionService.getConnection(user.id, post.connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    // Delete the post from the provider
    const deleteResult = await provider.deletePost(
      connection.credentials,
      post.externalId!
    );

    if (!deleteResult.ok) {
      return res.status(400).json({
        success: false,
        error: `Delete failed: ${deleteResult.error}`
      });
    }

    // Delete the local post record
    await prisma.post.delete({
      where: { id: postId }
    });

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /publish/posts
 * Get all published posts for the user
 */
router.get('/posts', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { userId: user.id },
        include: {
          connection: {
            select: {
              id: true,
              name: true,
              providerId: true
            }
          },
          draft: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.post.count({
        where: { userId: user.id }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      message: 'Published posts retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;