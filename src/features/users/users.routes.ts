import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { updateProfileSchema, getUserByIdSchema, getUserStatsSchema, registerPushTokenSchema } from './users.validation';

const router = Router();

/**
 * GET /api/users/profile
 * Get current user's profile
 * Requires authentication
 */
router.get('/profile', authenticate, usersController.getMyProfile);

/**
 * PATCH /api/users/profile
 * Update current user's profile
 * Requires authentication
 */
router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  usersController.updateMyProfile
);

/**
 * DELETE /api/users/profile
 * Deactivate current user's account
 * Requires authentication
 */
router.delete('/profile', authenticate, usersController.deactivateAccount);

/**
 * POST /api/users/push-token
 * Register push token for notifications
 * Requires authentication
 */
router.post(
  '/push-token',
  authenticate,
  validate(registerPushTokenSchema),
  usersController.registerPushToken
);

/**
 * DELETE /api/users/push-token
 * Deactivate push token (e.g., on logout)
 * Requires authentication
 */
router.delete('/push-token', authenticate, usersController.deactivatePushToken);

/**
 * GET /api/users/:id/stats
 * Get user stats (public)
 */
router.get('/:id/stats', validate(getUserStatsSchema), usersController.getUserStats);

/**
 * GET /api/users/:id/profile
 * Get user profile by ID (public, limited data)
 */
router.get('/:id/profile', validate(getUserByIdSchema), usersController.getUserProfile);

export default router;
