import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../types';
import { ConnectionService } from '../services/connection';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const connectionService = new ConnectionService();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /connections
 * Get all connections for the authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const connections = await connectionService.getUserConnections(user.id);

    // Don't return sensitive credentials in the list
    const safeConnections = connections.map(conn => ({
      ...conn,
      credentials: undefined
    }));

    res.json({
      success: true,
      data: safeConnections,
      message: 'Connections retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /connections
 * Create a new provider connection
 */
router.post('/', [
  body('providerId').notEmpty().withMessage('Provider ID is required'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('credentials').isObject().withMessage('Credentials must be an object')
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
    const { providerId, name, credentials } = req.body;

    const connection = await connectionService.createConnection(
      user.id,
      providerId,
      name,
      credentials
    );

    // Don't return credentials in response
    const safeConnection = {
      ...connection,
      credentials: undefined
    };

    res.status(201).json({
      success: true,
      data: safeConnection,
      message: 'Connection created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /connections/:connectionId
 * Get a specific connection
 */
router.get('/:connectionId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { connectionId } = req.params;

    const connection = await connectionService.getConnection(user.id, connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    // Don't return credentials
    const safeConnection = {
      ...connection,
      credentials: undefined
    };

    res.json({
      success: true,
      data: safeConnection,
      message: 'Connection retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /connections/:connectionId
 * Update a connection
 */
router.put('/:connectionId', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('credentials').optional().isObject(),
  body('isActive').optional().isBoolean()
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
    const { connectionId } = req.params;
    const updates = req.body;

    const connection = await connectionService.updateConnection(
      user.id,
      connectionId,
      updates
    );

    // Don't return credentials
    const safeConnection = {
      ...connection,
      credentials: undefined
    };

    res.json({
      success: true,
      data: safeConnection,
      message: 'Connection updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /connections/:connectionId
 * Delete a connection
 */
router.delete('/:connectionId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { connectionId } = req.params;

    await connectionService.deleteConnection(user.id, connectionId);

    res.json({
      success: true,
      message: 'Connection deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /connections/:connectionId/verify
 * Verify a connection is working
 */
router.get('/:connectionId/verify', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { connectionId } = req.params;

    const result = await connectionService.verifyConnection(user.id, connectionId);

    res.json({
      success: true,
      data: result,
      message: result.ok ? 'Connection verified successfully' : 'Connection verification failed'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /connections/:connectionId/test
 * Test connection and get sample data
 */
router.get('/:connectionId/test', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { connectionId } = req.params;

    const result = await connectionService.testConnection(user.id, connectionId);

    res.json({
      success: true,
      data: result,
      message: 'Connection test completed successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /connections/:connectionId/sync
 * Sync posts from the provider
 */
router.post('/:connectionId/sync', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { connectionId } = req.params;

    const result = await connectionService.syncPosts(user.id, connectionId);

    res.json({
      success: true,
      data: result,
      message: `Sync completed: ${result.synced} posts synced`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /connections/:connectionId/posts
 * Get posts from a specific connection
 */
router.get('/:connectionId/posts', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { connectionId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const connection = await connectionService.getConnection(user.id, connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    // Get posts from the provider directly
    const { getProvider } = require('../providers');
    const provider = getProvider(connection.providerId);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    const posts = await provider.listPosts(connection.credentials, { page, limit });

    res.json({
      success: true,
      data: posts,
      message: 'Posts retrieved successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;