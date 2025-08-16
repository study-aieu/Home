import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AuthService } from '../services/auth';

const authService = new AuthService();

/**
 * Middleware to authenticate JWT tokens
 */
export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }

    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const user = await authService.verifyToken(token);
      req.user = user;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

/**
 * Middleware to check if user owns a resource
 */
export function requireOwnership(resourceUserIdField: string = 'userId') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (user.id !== resourceUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    next();
  };
}