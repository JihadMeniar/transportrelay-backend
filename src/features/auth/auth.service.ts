import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRepository } from './auth.repository';
import {
  RegisterDTO,
  LoginDTO,
  AuthResponse,
  AuthTokenPayload,
  User,
  userRowToUser,
} from '../../shared/types';
import { jwtConfig } from '../../config/jwt';
import { bcryptConfig } from '../../config';
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

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, bcryptConfig.saltRounds);

    // Create user
    const user = await authRepository.create({
      email: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
      passwordHash,
    });

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
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret) as AuthTokenPayload;

      // Get user
      const userRow = await authRepository.findById(decoded.userId);
      if (!userRow || !userRow.is_active) {
        throw new AppError(401, 'Invalid refresh token');
      }

      const user = userRowToUser(userRow);

      // Generate new access token
      const token = this.generateAccessToken(user);

      return { token };
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
