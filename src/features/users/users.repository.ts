import { pool } from '../../config/database';
import { User, UserStats, UpdateUserDTO } from '../../shared/types';

/**
 * Database row interface for users
 */
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  department: string | null;
  role: string;
  is_active: boolean;
  is_priority: boolean;
  referral_code: string;
  referred_by: string | null;
  stats_published: number;
  stats_accepted: number;
  rating: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert database row to User object (without password)
 */
export const userRowToUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  phone: row.phone || '',
  department: row.department,
  role: row.role as 'driver' | 'admin',
  isActive: row.is_active,
  isPriority: row.is_priority || false,
  referralCode: row.referral_code,
  referredBy: row.referred_by,
  stats: {
    published: row.stats_published,
    accepted: row.stats_accepted,
    rating: parseFloat(row.rating.toString()),
  },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class UsersRepository {
  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<UserRow | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserRow | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateUserDTO): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }

    if (data.department !== undefined) {
      fields.push(`department = $${paramIndex++}`);
      values.push(data.department);
    }

    if (fields.length === 0) {
      const user = await this.findById(userId);
      return user ? userRowToUser(user) : null;
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return userRowToUser(result.rows[0]);
  }

  /**
   * Get user stats
   */
  async getStats(userId: string): Promise<UserStats | null> {
    const query = `
      SELECT stats_published, stats_accepted, rating
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      published: row.stats_published,
      accepted: row.stats_accepted,
      rating: parseFloat(row.rating.toString()),
    };
  }

  /**
   * Update user rating
   */
  async updateRating(userId: string, newRating: number): Promise<void> {
    const query = `
      UPDATE users
      SET rating = $1, updated_at = NOW()
      WHERE id = $2
    `;

    await pool.query(query, [newRating, userId]);
  }

  /**
   * Deactivate user account
   */
  async deactivate(userId: string): Promise<boolean> {
    const query = `
      UPDATE users
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Reactivate user account
   */
  async reactivate(userId: string): Promise<boolean> {
    const query = `
      UPDATE users
      SET is_active = true, updated_at = NOW()
      WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Register or update push token for a user
   */
  async registerPushToken(userId: string, pushToken: string, platform: string): Promise<void> {
    // Désactiver les anciens tokens avec le même push token (si changement d'utilisateur)
    await pool.query(
      `UPDATE push_tokens SET is_active = false, updated_at = NOW() WHERE push_token = $1 AND user_id != $2`,
      [pushToken, userId]
    );

    // Upsert le token pour cet utilisateur
    const query = `
      INSERT INTO push_tokens (user_id, push_token, platform, is_active, updated_at)
      VALUES ($1, $2, $3, true, NOW())
      ON CONFLICT (push_token)
      DO UPDATE SET
        user_id = $1,
        platform = $3,
        is_active = true,
        updated_at = NOW()
    `;
    await pool.query(query, [userId, pushToken, platform]);
  }

  /**
   * Deactivate push token
   */
  async deactivatePushToken(userId: string, pushToken?: string): Promise<void> {
    if (pushToken) {
      await pool.query(
        `UPDATE push_tokens SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND push_token = $2`,
        [userId, pushToken]
      );
    } else {
      // Désactiver tous les tokens de l'utilisateur
      await pool.query(
        `UPDATE push_tokens SET is_active = false, updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );
    }
  }

  /**
   * Get active push tokens for a user
   */
  async getActivePushTokens(userId: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT push_token FROM push_tokens WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    return result.rows.map(row => row.push_token);
  }

  /**
   * Get active push tokens for all users in a department (excluding a specific user)
   */
  async getPushTokensByDepartment(department: string, excludeUserId?: string): Promise<string[]> {
    let query = `
      SELECT pt.push_token
      FROM push_tokens pt
      JOIN users u ON u.id = pt.user_id
      WHERE u.department = $1
        AND u.is_active = true
        AND pt.is_active = true
    `;
    const params: any[] = [department];

    if (excludeUserId) {
      query += ` AND u.id != $2`;
      params.push(excludeUserId);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => row.push_token);
  }

  /**
   * Get active push tokens for a department, separated by priority status
   * Priority users receive notifications before regular users
   */
  async getPushTokensByDepartmentWithPriority(
    department: string,
    excludeUserId?: string
  ): Promise<{ priority: string[]; regular: string[] }> {
    let query = `
      SELECT pt.push_token, u.is_priority
      FROM push_tokens pt
      JOIN users u ON u.id = pt.user_id
      WHERE u.department = $1
        AND u.is_active = true
        AND pt.is_active = true
    `;
    const params: any[] = [department];

    if (excludeUserId) {
      query += ` AND u.id != $2`;
      params.push(excludeUserId);
    }

    const result = await pool.query(query, params);

    const priority: string[] = [];
    const regular: string[] = [];

    for (const row of result.rows) {
      if (row.is_priority) {
        priority.push(row.push_token);
      } else {
        regular.push(row.push_token);
      }
    }

    return { priority, regular };
  }

  /**
   * Set user priority status (admin only)
   */
  async setUserPriority(userId: string, isPriority: boolean): Promise<boolean> {
    const result = await pool.query(
      `UPDATE users SET is_priority = $1, updated_at = NOW() WHERE id = $2`,
      [isPriority, userId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get all priority users
   */
  async getPriorityUsers(): Promise<User[]> {
    const result = await pool.query(
      `SELECT * FROM users WHERE is_priority = true AND is_active = true ORDER BY name`
    );
    return result.rows.map(userRowToUser);
  }

  /**
   * Find user by email (for admin to set priority)
   */
  async findUserByEmailForPriority(email: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows.length > 0 ? userRowToUser(result.rows[0]) : null;
  }
}

export const usersRepository = new UsersRepository();
