/**
 * Ride Limit Middleware
 * Checks if free users have exceeded their monthly ride limit
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { subscriptionsService } from '../../features/subscriptions/subscriptions.service';
import { AppError } from './errorHandler.middleware';

/**
 * Middleware to check if user can perform ride actions
 * Use this before createRide and acceptRide endpoints
 */
export const checkRideLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }

    const result = await subscriptionsService.canPerformRideAction(userId);

    if (!result.allowed) {
      res.status(403).json({
        success: false,
        message: result.reason,
        data: {
          limitReached: true,
          remaining: result.remaining,
        },
      });
      return;
    }

    // Add remaining rides info to request for potential use in response
    (req as any).rideLimit = {
      remaining: result.remaining,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to increment ride usage after successful action
 * Use this after ride is created or accepted
 */
export const incrementRideUsage = (type: 'published' | 'accepted') => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (userId) {
        // Increment usage in background (don't block response)
        subscriptionsService.incrementUsage(userId, type).catch((err) => {
          console.error('[RideLimit] Error incrementing usage:', err);
        });
      }

      next();
    } catch (error) {
      // Don't fail the request if usage tracking fails
      console.error('[RideLimit] Error in increment middleware:', error);
      next();
    }
  };
};
