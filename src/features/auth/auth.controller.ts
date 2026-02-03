import { Response } from 'express';
import { authService } from './auth.service';
import { RegisterDTO, LoginDTO } from '../../shared/types';
import { AuthRequest, asyncHandler } from '../../shared/middleware';

export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: RegisterDTO = req.body;
    const result = await authService.register(data);

    res.status(201).json({
      success: true,
      data: result,
    });
  });

  /**
   * POST /api/auth/login
   * Login user
   */
  login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: LoginDTO = req.body;
    const result = await authService.login(data);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /api/auth/me
   * Get current user profile (protected)
   */
  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const user = await authService.getProfile(userId);

    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  /**
   * POST /api/auth/refresh
   * Refresh access token
   */
  refreshToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * POST /api/auth/logout
   * Logout user (client-side token removal)
   */
  logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
    // JWT is stateless, so logout is handled client-side
    // This endpoint exists for consistency and future token blacklisting

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  });

  /**
   * POST /api/auth/change-password
   * Change user password (protected)
   */
  changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  });
}

export const authController = new AuthController();
