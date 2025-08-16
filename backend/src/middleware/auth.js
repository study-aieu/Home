const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware to authenticate JWT tokens
 * Extracts user information and adds it to req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
    }

    // Add user info to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  }
};

/**
 * Middleware to check if user has required permissions
 * Can be extended for role-based access control
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    // For now, all authenticated users have access
    // This can be extended with role-based permissions
    next();
  };
};

/**
 * Middleware to check if user owns the resource
 * Used for operations on user-specific data
 */
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.draftId || req.params.postId;
      
      if (!resourceId) {
        return next();
      }

      let resource;
      
      switch (resourceType) {
        case 'draft':
          resource = await prisma.draft.findUnique({
            where: { id: resourceId },
            select: { userId: true }
          });
          break;
        case 'post':
          resource = await prisma.post.findUnique({
            where: { id: resourceId },
            select: { userId: true }
          });
          break;
        case 'connection':
          resource = await prisma.connection.findUnique({
            where: { id: resourceId },
            select: { userId: true }
          });
          break;
        case 'image':
          resource = await prisma.image.findUnique({
            where: { id: resourceId },
            select: { userId: true }
          });
          break;
        default:
          return next();
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      if (resource.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Ownership verification failed',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true
        }
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireOwnership,
  optionalAuth
};