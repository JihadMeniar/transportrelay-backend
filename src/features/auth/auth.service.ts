import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRepository } from './auth.repository';
import { referralRepository } from './referral.repository';
import {
  RegisterDTO,
  LoginDTO,
  AuthResponse,
  AuthTokenPayload,
  User,
  userRowToUser,
} from '../../shared/types';
import { jwtConfig } from '../../config/jwt';
import { bcryptConfig, serverConfig } from '../../config';
import { AppError } from '../../shared/middleware';

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterDTO): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await authRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    // Validate referral code
    const adminSeedCode = serverConfig.adminSeedReferralCode;
    let referrerId: string | undefined;

    if (adminSeedCode && data.referralCode.toUpperCase() === adminSeedCode.toUpperCase()) {
      // Admin seed code - no referrer (for bootstrapping first users)
      referrerId = undefined;
    } else {
      const referrer = await referralRepository.findUserByReferralCode(data.referralCode);
      if (!referrer) {
        throw new AppError(400, 'Code de parrainage invalide');
      }
      referrerId = referrer.id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, bcryptConfig.saltRounds);

    // Generate unique referral code for new user
    const newUserReferralCode = await referralRepository.generateUniqueReferralCode(data.name);

    // Create user
    const user = await authRepository.create({
      email: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
      department: data.department,
      passwordHash,
      referralCode: newUserReferralCode,
      referredBy: referrerId,
    });

    // Award referral bonus to referrer (if on free plan)
    if (referrerId) {
      try {
        const { subscriptionsRepository } = await import('../subscriptions/subscriptions.repository');
        const referrerSubscription = await subscriptionsRepository.getSubscriptionByUserId(referrerId);
        const isFreePlan = !referrerSubscription || referrerSubscription.status === 'free';

        if (isFreePlan) {
          await referralRepository.createReferralBonus(referrerId, user.id, 3);
        }
      } catch (err) {
        console.error('[Auth] Error awarding referral bonus:', err);
      }
    }

    // Generate tokens
    const token = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user,
      token,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginDTO): Promise<AuthResponse> {
    // Find user by email
    const userRow = await authRepository.findByEmail(data.email);
    if (!userRow) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Check if user is active
    if (!userRow.is_active) {
      throw new AppError(403, 'Account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, userRow.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Update last login
    await authRepository.updateLastLogin(userRow.id);

    // Convert to User
    const user = userRowToUser(userRow);

    // Generate tokens
    const token = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user,
      token,
      refreshToken,
    };
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<User> {
    const userRow = await authRepository.findById(userId);
    if (!userRow) {
      throw new AppError(404, 'User not found');
    }

    if (!userRow.is_active) {
      throw new AppError(403, 'Account has been deactivated');
    }

    return userRowToUser(userRow);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret) as AuthTokenPayload;

      // Get user
      const userRow = await authRepository.findById(decoded.userId);
      if (!userRow || !userRow.is_active) {
        throw new AppError(401, 'Invalid refresh token');
      }

      const user = userRowToUser(userRow);

      // Generate new access token and rotate refresh token
      const token = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return { token, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(401, 'Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(401, 'Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user
    const userRow = await authRepository.findById(userId);
    if (!userRow) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, userRow.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, bcryptConfig.saltRounds);

    // Update password
    await authRepository.updatePassword(userId, newPasswordHash);
  }

  /**
   * Accept CGU
   */
  async acceptCgu(userId: string, version: string): Promise<User> {
    await authRepository.acceptCgu(userId, version);
    const userRow = await authRepository.findById(userId);
    if (!userRow) {
      throw new AppError(404, 'User not found');
    }
    return userRowToUser(userRow);
  }

  /**
   * Generate access token (JWT)
   */
  private generateAccessToken(user: User): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    } as any);
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(user: User): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, jwtConfig.refreshSecret, {
      expiresIn: jwtConfig.refreshExpiresIn,
    } as any);
  }
}

export const authService = new AuthService();
