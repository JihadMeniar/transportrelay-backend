import { pool } from '../../config/database';

export class ReferralRepository {
  /**
   * Find user by referral code
   */
  async findUserByReferralCode(referralCode: string): Promise<{ id: string; is_priority: boolean } | null> {
    const result = await pool.query(
      'SELECT id, is_priority FROM users WHERE referral_code = $1 AND is_active = true',
      [referralCode.toUpperCase()]
    );
    return result.rows[0] || null;
  }

  /**
   * Generate a unique referral code for a new user
   */
  async generateUniqueReferralCode(name: string): Promise<string> {
    const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'USR';
    let code: string = '';
    let exists = true;

    while (exists) {
      const random = Math.random().toString(36).substring(2, 7).toUpperCase();
      code = `${prefix}${random}`;
      const result = await pool.query(
        'SELECT COUNT(*) FROM users WHERE referral_code = $1',
        [code]
      );
      exists = parseInt(result.rows[0].count) > 0;
    }

    return code;
  }

  /**
   * Record a referral bonus
   */
  async createReferralBonus(referrerId: string, referredId: string, bonusRides: number = 3): Promise<void> {
    const monthYear = new Date().toISOString().slice(0, 7);
    await pool.query(
      `INSERT INTO referral_bonuses (referrer_id, referred_id, bonus_rides, month_year)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (referrer_id, referred_id) DO NOTHING`,
      [referrerId, referredId, bonusRides, monthYear]
    );
  }

  /**
   * Get total referral bonus rides for a user (permanent, all referrals)
   */
  async getReferralBonusForMonth(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COALESCE(SUM(bonus_rides), 0) as total_bonus
       FROM referral_bonuses
       WHERE referrer_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].total_bonus);
  }

  /**
   * Get count of users referred by a user
   */
  async getReferralCount(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM users WHERE referred_by = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}

export const referralRepository = new ReferralRepository();
