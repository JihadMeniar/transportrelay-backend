import { pool } from '../../config/database';
import { User, UserRow, CreateUserDTO, userRowToUser } from '../../shared/types';

export class AuthRepository {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserRow | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query<UserRow>(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserRow | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query<UserRow>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDTO & { passwordHash: string; referralCode: string; referredBy?: string }): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, name, phone, department, role, is_active, referral_code, referred_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.email,
      data.passwordHash,
      data.name,
      data.phone || null,
      data.department || null,
      'driver', // Default role
      true, // Active by default
      data.referralCode,
      data.referredBy || null,
    ];

    const result = await pool.query<UserRow>(query, values);
    return userRowToUser(result.rows[0]);
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    const query = 'UPDATE users SET updated_at = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2';
    await pool.query(query, [passwordHash, id]);
  }

  /**
   * Deactivate user account
   */
  async deactivate(id: string): Promise<void> {
    const query = 'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  }

  /**
   * Activate user account
   */
  async activate(id: string): Promise<void> {
    const query = 'UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  }
}

export const authRepository = new AuthRepository();
