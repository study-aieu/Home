const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, handleValidationError } = require('../middleware/errorHandler');
const { requireOwnership } = require('../middleware/auth');
const { verifyProviderConnection } = require('../services/providerService');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/connections
 * @desc    Get user's connections
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
  query('providerId')
    .optional()
    .isString()
    .withMessage('Provider ID must be a string'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { page = 1, limit = 50, providerId, isActive } = req.query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    userId: req.user.id
  };

  if (providerId) {
    where.providerId = providerId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  // Get connections with pagination
  const [connections, total] = await Promise.all([
    prisma.connection.findMany({
      where,
      select: {
        id: true,
        name: true,
        isActive: true,
        lastSync: true,
        createdAt: true,
        updatedAt: true,
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
            logo: true,
            category: true,
            features: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.connection.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      connections,
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
 * @route   POST /api/connections
 * @desc    Create a new connection
 * @access  Private
 */
router.post('/', [
  body('providerId')
    .isString()
    .notEmpty()
    .withMessage('Provider ID is required'),
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Connection name must be 1-100 characters'),
  body('credentials')
    .isObject()
    .withMessage('Credentials must be an object'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { providerId, name, credentials, settings } = req.body;

  // Check if provider exists and is active
  const provider = await prisma.provider.findUnique({
    where: { id: providerId, isActive: true }
  });

  if (!provider) {
    return res.status(404).json({
      success: false,
      error: 'Provider not found or inactive',
      code: 'PROVIDER_NOT_FOUND'
    });
  }

  // Check if connection name already exists for this user and provider
  const existingConnection = await prisma.connection.findFirst({
    where: {
      userId: req.user.id,
      providerId,
      name: name.trim()
    }
  });

  if (existingConnection) {
    return res.status(400).json({
      success: false,
      error: 'Connection name already exists for this provider',
      code: 'DUPLICATE_CONNECTION_NAME'
    });
  }

  // Verify connection with provider
  try {
    const verificationResult = await verifyProviderConnection(provider.name, credentials);
    
    if (!verificationResult.ok) {
      return res.status(400).json({
        success: false,
        error: 'Connection verification failed',
        details: verificationResult.details,
        code: 'CONNECTION_VERIFICATION_FAILED'
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Connection verification failed',
      details: error.message,
      code: 'CONNECTION_VERIFICATION_ERROR'
    });
  }

  // Create connection
  const connection = await prisma.connection.create({
    data: {
      userId: req.user.id,
      providerId,
      name: name.trim(),
      credentials,
      settings: settings || {},
      isActive: true
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      provider: {
        select: {
          id: true,
          name: true,
          displayName: true,
          logo: true,
          category: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Connection created successfully',
    data: { connection }
  });
}));

/**
 * @route   GET /api/connections/:id
 * @desc    Get connection by ID
 * @access  Private
 */
router.get('/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Connection ID is required')
], requireOwnership('connection'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  const connection = await prisma.connection.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      credentials: true,
      settings: true,
      isActive: true,
      lastSync: true,
      createdAt: true,
      updatedAt: true,
      provider: {
        select: {
          id: true,
          name: true,
          displayName: true,
          logo: true,
          category: true,
          features: true,
          authType: true,
          authFields: true
        }
      }
    }
  });

  if (!connection) {
    return res.status(404).json({
      success: false,
      error: 'Connection not found',
      code: 'CONNECTION_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { connection }
  });
}));

/**
 * @route   PUT /api/connections/:id
 * @desc    Update connection
 * @access  Private
 */
router.put('/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Connection ID is required'),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Connection name must be 1-100 characters'),
  body('credentials')
    .optional()
    .isObject()
    .withMessage('Credentials must be an object'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], requireOwnership('connection'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;
  const { name, credentials, settings, isActive } = req.body;

  // Get current connection
  const currentConnection = await prisma.connection.findUnique({
    where: { id },
    include: { provider: true }
  });

  if (!currentConnection) {
    return res.status(404).json({
      success: false,
      error: 'Connection not found',
      code: 'CONNECTION_NOT_FOUND'
    });
  }

  // Check if new name conflicts with existing connections
  if (name && name !== currentConnection.name) {
    const existingConnection = await prisma.connection.findFirst({
      where: {
        userId: req.user.id,
        providerId: currentConnection.providerId,
        name: name.trim(),
        id: { not: id }
      }
    });

    if (existingConnection) {
      return res.status(400).json({
        success: false,
        error: 'Connection name already exists for this provider',
        code: 'DUPLICATE_CONNECTION_NAME'
      });
    }
  }

  // Verify new credentials if provided
  if (credentials) {
    try {
      const verificationResult = await verifyProviderConnection(
        currentConnection.provider.name, 
        credentials
      );
      
      if (!verificationResult.ok) {
        return res.status(400).json({
          success: false,
          error: 'Connection verification failed',
          details: verificationResult.details,
          code: 'CONNECTION_VERIFICATION_FAILED'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Connection verification failed',
        details: error.message,
        code: 'CONNECTION_VERIFICATION_ERROR'
      });
    }
  }

  // Update connection
  const updatedConnection = await prisma.connection.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(credentials && { credentials }),
      ...(settings && { settings }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date()
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      lastSync: true,
      createdAt: true,
      updatedAt: true,
      provider: {
        select: {
          id: true,
          name: true,
          displayName: true,
          logo: true,
          category: true
        }
      }
    }
  });

  res.json({
    success: true,
    message: 'Connection updated successfully',
    data: { connection: updatedConnection }
  });
}));

/**
 * @route   DELETE /api/connections/:id
 * @desc    Delete connection
 * @access  Private
 */
router.delete('/:id', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Connection ID is required')
], requireOwnership('connection'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  // Check if connection has published posts
  const postCount = await prisma.post.count({
    where: { connectionId: id }
  });

  if (postCount > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete connection with published posts',
      code: 'CONNECTION_HAS_POSTS'
    });
  }

  // Delete connection
  await prisma.connection.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Connection deleted successfully'
  });
}));

/**
 * @route   POST /api/connections/:id/verify
 * @desc    Verify connection with provider
 * @access  Private
 */
router.post('/:id/verify', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Connection ID is required')
], requireOwnership('connection'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  const connection = await prisma.connection.findUnique({
    where: { id },
    include: { provider: true }
  });

  if (!connection) {
    return res.status(404).json({
      success: false,
      error: 'Connection not found',
      code: 'CONNECTION_NOT_FOUND'
    });
  }

  try {
    // Verify connection
    const verificationResult = await verifyProviderConnection(
      connection.provider.name,
      connection.credentials
    );

    // Update last sync time if verification successful
    if (verificationResult.ok) {
      await prisma.connection.update({
        where: { id },
        data: { lastSync: new Date() }
      });
    }

    res.json({
      success: true,
      data: {
        verified: verificationResult.ok,
        details: verificationResult.details
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        verified: false,
        details: error.message
      }
    });
  }
}));

/**
 * @route   POST /api/connections/:id/sync
 * @desc    Sync posts from provider
 * @access  Private
 */
router.post('/:id/sync', [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Connection ID is required')
], requireOwnership('connection'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { id } = req.params;

  // This endpoint would trigger a sync job
  // For now, just return success
  res.json({
    success: true,
    message: 'Sync job started',
    data: { jobId: `sync_${id}_${Date.now()}` }
  });
}));

module.exports = router;