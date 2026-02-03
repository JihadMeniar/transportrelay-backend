import { Response } from 'express';
import { usersService } from './users.service';
import { UpdateUserDTO } from '../../shared/types';
import { AuthRequest, asyncHandler } from '../../shared/middleware';

export class UsersController {
  /**
   * GET /api/users/profile
   * Get current user's profile
   */
  getMyProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const user = await usersService.getMyProfile(userId);

    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  /**
   * PATCH /api/users/profile
   * Update current user's profile
   */
  updateMyProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const updateData: UpdateUserDTO = req.body;

    const user = await usersService.updateMyProfile(userId, updateData);

    res.status(200).json({
      success: true,
      data: { user },
      message: 'Profile updated successfully',
    });
  });

  /**
   * GET /api/users/:id/stats
   * Get user stats (public endpoint)
   */
  getUserStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;

    const stats = await usersService.getUserStats(userId);

    res.status(200).json({
      success: true,
      data: { stats },
    });
  });

  /**
   * GET /api/users/:id/profile
   * Get user profile by ID (public endpoint)
   */
  getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.params.id;

    const user = await usersService.getUserProfile(userId);

    // Return limited public data
    const publicUser = {
      id: user.id,
      name: user.name,
      stats: user.stats,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      data: { user: publicUser },
    });
  });

  /**
   * DELETE /api/users/profile
   * Deactivate current user's account
   */
  deactivateAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    await usersService.deactivateAccount(userId);

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully',
    });
  });

  /**
   * POST /api/users/push-token
   * Register push token for notifications
   */
  registerPushToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { pushToken, platform } = req.body;

    await usersService.registerPushToken(userId, pushToken, platform);

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
    });
  });

  /**
   * DELETE /api/users/push-token
   * Deactivate push token (e.g., on logout)
   */
  deactivatePushToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    await usersService.deactivatePushToken(userId);

    res.status(200).json({
      success: true,
      message: 'Push token deactivated successfully',
    });
  });
}

export const usersController = new UsersController();
