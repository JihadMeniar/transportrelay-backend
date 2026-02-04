-- Migration: Add referral/invitation system
-- Users must be invited to register. Referrers on free plan get +3 accepted rides per referral.

-- Add referral columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Generate referral codes for existing users
UPDATE users SET referral_code = UPPER(
  SUBSTRING(REPLACE(name, ' ', ''), 1, 3) ||
  SUBSTRING(MD5(RANDOM()::TEXT), 1, 5)
) WHERE referral_code IS NULL;

-- Make referral_code NOT NULL after backfill
ALTER TABLE users ALTER COLUMN referral_code SET NOT NULL;

-- Create referral_bonuses table to track bonus rides earned from referrals
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_rides INTEGER NOT NULL DEFAULT 3,
  month_year VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer ON referral_bonuses(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_month ON referral_bonuses(referrer_id, month_year);
