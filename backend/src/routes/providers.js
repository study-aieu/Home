const express = require('express');
const { query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, handleValidationError } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/providers
 * @desc    Get all supported providers/platforms
 * @access  Public
 */
router.get('/', [
  query('category')
    .optional()
    .isIn(['website-builder', 'cms', 'static-generator', 'ecommerce', 'other'])
    .withMessage('Invalid category'),
  query('feature')
    .optional()
    .isString()
    .withMessage('Feature must be a string'),
  query('search')
    .optional()
    .isString()
    .withMessage('Search term must be a string'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw handleValidationError(errors);
  }

  const { category, feature, search, page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    isActive: true
  };

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (feature) {
    where.features = {
      path: `$.${feature}`,
      equals: true
    };
  }

  // Get providers with pagination
  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        logo: true,
        website: true,
        category: true,
        features: true,
        authType: true,
        authFields: true,
        createdAt: true
      },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ],
      skip,
      take: parseInt(limit)
    }),
    prisma.provider.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      providers,
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
 * @route   GET /api/providers/:id
 * @desc    Get provider by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const provider = await prisma.provider.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      displayName: true,
      description: true,
      logo: true,
      website: true,
      category: true,
      features: true,
      authType: true,
      authFields: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!provider || !provider.isActive) {
    return res.status(404).json({
      success: false,
      error: 'Provider not found',
      code: 'PROVIDER_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { provider }
  });
}));

/**
 * @route   GET /api/providers/categories
 * @desc    Get all provider categories
 * @access  Public
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await prisma.provider.groupBy({
    by: ['category'],
    where: { isActive: true },
    _count: {
      category: true
    }
  });

  const categoryData = categories.map(cat => ({
    category: cat.category,
    count: cat._count.category
  }));

  res.json({
    success: true,
    data: { categories: categoryData }
  });
}));

/**
 * @route   GET /api/providers/features
 * @desc    Get all available features
 * @access  Public
 */
router.get('/features', asyncHandler(async (req, res) => {
  // Get a sample provider to extract feature structure
  const sampleProvider = await prisma.provider.findFirst({
    where: { isActive: true },
    select: { features: true }
  });

  if (!sampleProvider) {
    return res.json({
      success: true,
      data: { features: [] }
    });
  }

  const features = Object.keys(sampleProvider.features).map(key => ({
    name: key,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
    description: getFeatureDescription(key)
  }));

  res.json({
    success: true,
    data: { features }
  });
}));

/**
 * Helper function to get feature descriptions
 */
function getFeatureDescription(feature) {
  const descriptions = {
    images: 'Supports image uploads and management',
    tags: 'Supports post tagging',
    scheduling: 'Supports post scheduling',
    edit: 'Supports post editing after publication',
    delete: 'Supports post deletion',
    categories: 'Supports post categorization',
    excerpts: 'Supports post excerpts/summaries',
    featuredImages: 'Supports featured/hero images',
    customFields: 'Supports custom metadata fields'
  };

  return descriptions[feature] || 'Feature support information';
}

/**
 * @route   GET /api/providers/auth-types
 * @desc    Get all authentication types
 * @access  Public
 */
router.get('/auth-types', asyncHandler(async (req, res) => {
  const authTypes = await prisma.provider.groupBy({
    by: ['authType'],
    where: { isActive: true },
    _count: {
      authType: true
    }
  });

  const authTypeData = authTypes.map(auth => ({
    type: auth.authType,
    count: auth._count.authType,
    description: getAuthTypeDescription(auth.authType)
  }));

  res.json({
    success: true,
    data: { authTypes: authTypeData }
  });
}));

/**
 * Helper function to get authentication type descriptions
 */
function getAuthTypeDescription(authType) {
  const descriptions = {
    'api-key': 'API key authentication',
    'oauth': 'OAuth 2.0 authentication',
    'ftp': 'FTP/SFTP credentials',
    'webhook': 'Webhook URL configuration',
    'custom': 'Custom authentication method'
  };

  return descriptions[authType] || 'Custom authentication';
}

module.exports = router;