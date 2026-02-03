import { usersRepository, userRowToUser } from './users.repository';
import { User, UserStats, UpdateUserDTO } from '../../shared/types';
import { AppError } from '../../shared/middleware';

export class UsersService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<User> {
    const userRow = await usersRepository.findById(userId);

    if (!userRow) {
      throw new AppError(404, 'User not found');
    }

    if (!userRow.is_active) {
      throw new AppError(403, 'User account is deactivated');
    }

    return userRowToUser(userRow);
  }

  /**
   * Get current user's profile
   */
  async getMyProfile(userId: string): Promise<User> {
    return this.getUserProfile(userId);
  }

  /**
   * Update current user's profile
   */
  async updateMyProfile(userId: string, data: UpdateUserDTO): Promise<User> {
    // Validate that user exists and is active
    const existingUser = await usersRepository.findById(userId);

    if (!existingUser) {
      throw new AppError(404, 'User not found');
    }

    if (!existingUser.is_active) {
      throw new AppError(403, 'User account is deactivated');
    }

    // Update profile
    const updatedUser = await usersRepository.updateProfile(userId, data);

    if (!updatedUser) {
      throw new AppError(500, 'Failed to update profile');
    }

    return updatedUser;
  }

  /**
   * Get user stats (public)
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const stats = await usersRepository.getStats(userId);

    if (!stats) {
      throw new AppError(404, 'User not found');
    }

    return stats;
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string): Promise<void> {
    const success = await usersRepository.deactivate(userId);

    if (!success) {
      throw new AppError(404, 'User not found');
    }
  }

  /**
   * Reactivate user account (admin only)
   */
  async reactivateAccount(userId: string): Promise<void> {
    const success = await usersRepository.reactivate(userId);

    if (!success) {
      throw new AppError(404, 'User not found');
    }
  }

  /**
   * Register push token for notifications
   */
  async registerPushToken(userId: string, pushToken: string, platform: string): Promise<void> {
    await usersRepository.registerPushToken(userId, pushToken, platform);
  }

  /**
   * Deactivate push token (logout)
   */
  async deactivatePushToken(userId: string, pushToken?: string): Promise<void> {
    await usersRepository.deactivatePushToken(userId, pushToken);
  }

  /**
   * Get user's active push tokens
   */
  async getActivePushTokens(userId: string): Promise<string[]> {
    return usersRepository.getActivePushTokens(userId);
  }

  /**
   * Get user's department
   */
  async getUserDepartment(userId: string): Promise<string | null> {
    const userRow = await usersRepository.findById(userId);
    return userRow?.department || null;
  }

  /**
   * Get push tokens for all users in a department (for notifications)
   */
  async getPushTokensByDepartment(department: string, excludeUserId?: string): Promise<string[]> {
    return usersRepository.getPushTokensByDepartment(department, excludeUserId);
  }
}

export const usersService = new UsersService();
