import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /drafts
 * Get all drafts for the authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;

    const [drafts, total] = await Promise.all([
      prisma.draft.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.draft.count({
        where: { userId: user.id }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: drafts,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      message: 'Drafts retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /drafts
 * Create a new draft
 */
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
  body('excerpt').optional().trim().isLength({ max: 500 }),
  body('tags').optional().isArray(),
  body('categories').optional().isArray(),
  body('featuredImage').optional().isURL(),
  body('metadata').optional().isObject()
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
    const {
      title,
      content,
      excerpt,
      tags = [],
      categories = [],
      featuredImage,
      metadata = {}
    } = req.body;

    const draft = await prisma.draft.create({
      data: {
        userId: user.id,
        title,
        content,
        excerpt,
        tags,
        categories,
        featuredImage,
        metadata
      }
    });

    res.status(201).json({
      success: true,
      data: draft,
      message: 'Draft created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /drafts/:draftId
 * Get a specific draft
 */
router.get('/:draftId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { draftId } = req.params;

    const draft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        userId: user.id
      },
      include: {
        posts: {
          include: {
            connection: {
              select: {
                id: true,
                name: true,
                providerId: true
              }
            }
          }
        }
      }
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }

    res.json({
      success: true,
      data: draft,
      message: 'Draft retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /drafts/:draftId
 * Update a draft
 */
router.put('/:draftId', [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('content').optional().trim().isLength({ min: 1 }),
  body('excerpt').optional().trim().isLength({ max: 500 }),
  body('tags').optional().isArray(),
  body('categories').optional().isArray(),
  body('featuredImage').optional().isURL(),
  body('metadata').optional().isObject()
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
    const { draftId } = req.params;

    // Check if draft exists and belongs to user
    const existingDraft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        userId: user.id
      }
    });

    if (!existingDraft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }

    const updateData = { ...req.body };
    delete updateData.userId; // Prevent changing userId

    const draft = await prisma.draft.update({
      where: { id: draftId },
      data: updateData
    });

    res.json({
      success: true,
      data: draft,
      message: 'Draft updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /drafts/:draftId
 * Delete a draft
 */
router.delete('/:draftId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { draftId } = req.params;

    // Check if draft exists and belongs to user
    const existingDraft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        userId: user.id
      }
    });

    if (!existingDraft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }

    await prisma.draft.delete({
      where: { id: draftId }
    });

    res.json({
      success: true,
      message: 'Draft deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /drafts/:draftId/duplicate
 * Duplicate a draft
 */
router.post('/:draftId/duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { draftId } = req.params;

    const originalDraft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        userId: user.id
      }
    });

    if (!originalDraft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }

    const duplicatedDraft = await prisma.draft.create({
      data: {
        userId: user.id,
        title: `${originalDraft.title} (Copy)`,
        content: originalDraft.content,
        excerpt: originalDraft.excerpt,
        tags: originalDraft.tags,
        categories: originalDraft.categories,
        featuredImage: originalDraft.featuredImage,
        metadata: originalDraft.metadata
      }
    });

    res.status(201).json({
      success: true,
      data: duplicatedDraft,
      message: 'Draft duplicated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /drafts/:draftId/published-posts
 * Get all posts published from this draft
 */
router.get('/:draftId/published-posts', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { draftId } = req.params;

    // Verify draft ownership
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

    const posts = await prisma.post.findMany({
      where: {
        draftId,
        userId: user.id
      },
      include: {
        connection: {
          select: {
            id: true,
            name: true,
            providerId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: posts,
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