-- Seed: Apple App Store reviewer test account
-- Password: AppleReview2025 (bcrypt hash)
-- This account is used by Apple reviewers during App Store review process

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'apple.reviewer@transportrelay.app') THEN
    INSERT INTO users (
      email,
      password_hash,
      name,
      phone,
      department,
      referral_code,
      role,
      is_active,
      cgu_accepted_at,
      cgu_version,
      created_at,
      updated_at
    ) VALUES (
      'apple.reviewer@transportrelay.app',
      '$2b$10$Ti4stbqNzdYjqMRFVhspWeOTxhMdjdsDjbbImcmm2SDzLSNTCLVbK',
      'Apple Reviewer',
      '+33600000000',
      '75',
      'APPLEREVIEW',
      'user',
      true,
      NOW(),
      '1.0',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Apple reviewer account created';
  ELSE
    -- Update existing account to ensure it works
    UPDATE users SET
      password_hash = '$2b$10$Ti4stbqNzdYjqMRFVhspWeOTxhMdjdsDjbbImcmm2SDzLSNTCLVbK',
      cgu_accepted_at = COALESCE(cgu_accepted_at, NOW()),
      cgu_version = COALESCE(cgu_version, '1.0'),
      is_active = true
    WHERE email = 'apple.reviewer@transportrelay.app';
    RAISE NOTICE 'Apple reviewer account updated';
  END IF;
END
$$;
