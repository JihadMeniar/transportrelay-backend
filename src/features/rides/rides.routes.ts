import { Router, Request, Response, NextFunction } from 'express';
import { ridesController } from './rides.controller';
import { authenticate, optionalAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { checkRideLimit } from '../../shared/middleware/rideLimit.middleware';
import { uploadDocuments } from '../../config/multer';
import { uploadLimiter } from '../../shared/middleware/rateLimiter.middleware';
import {
  createRideSchema,
  getRidesSchema,
  getRideByIdSchema,
  updateRideStatusSchema,
  acceptRideSchema,
  deleteRideSchema,
} from './rides.validation';

const router = Router();

/**
 * GET /api/rides
 * Get all rides with optional filters
 * Authentication optional (masks data if not authenticated)
 */
router.get(
  '/',
  optionalAuth,
  validate(getRidesSchema),
  ridesController.getRides
);

/**
 * GET /api/rides/my-rides
 * Get current user's rides
 * Requires authentication
 */
router.get(
  '/my-rides',
  authenticate,
  ridesController.getMyRides
);

/**
 * GET /api/rides/:id
 * Get ride by ID
 * Authentication optional (masks data based on access)
 */
router.get(
  '/:id',
  optionalAuth,
  validate(getRideByIdSchema),
  ridesController.getRideById
);

/**
 * POST /api/rides
 * Create a new ride with optional documents
 * Requires authentication
 * Supports multipart/form-data with up to 5 documents
 * Note: No ride limit for publishing - limit only applies to accepting rides
 */
router.post(
  '/',
  authenticate,
  uploadLimiter,
  uploadDocuments.array('documents', 5),
  (req: Request, _res: Response, next: NextFunction) => {
    console.log('[Rides] POST /rides - Content-Type:', req.headers['content-type']);
    console.log('[Rides] POST /rides - body keys:', Object.keys(req.body || {}));
    console.log('[Rides] POST /rides - body:', JSON.stringify(req.body));
    next();
  },
  validate(createRideSchema),
  ridesController.createRide
);

/**
 * PATCH /api/rides/:id/accept
 * Accept a ride
 * Requires authentication
 */
router.patch(
  '/:id/accept',
  authenticate,
  checkRideLimit,
  validate(acceptRideSchema),
  ridesController.acceptRide
);

/**
 * PATCH /api/rides/:id/status
 * Update ride status (complete or cancel)
 * Requires authentication
 */
router.patch(
  '/:id/status',
  authenticate,
  validate(updateRideStatusSchema),
  ridesController.updateRideStatus
);

/**
 * DELETE /api/rides/:id
 * Delete a ride
 * Requires authentication
 */
router.delete(
  '/:id',
  authenticate,
  validate(deleteRideSchema),
  ridesController.deleteRide
);

export default router;
