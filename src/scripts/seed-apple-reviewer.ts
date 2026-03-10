/**
 * Seed script: Create Apple App Store reviewer test account
 * Usage: npx ts-node src/scripts/seed-apple-reviewer.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { pool } from '../config/database';

async function seedAppleReviewer() {
  const email = 'apple.reviewer@transportrelay.app';
  const password = 'AppleReview2025';
  const name = 'Apple Reviewer';
  const phone = '+33600000000';
  const department = '75';
  const referralCode = 'APPLEREVIEW';

  console.log('Creating Apple reviewer test account...');

  const client = await pool.connect();
  try {
    // Check if already exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('Account already exists, updating password and accepting CGU...');
      const passwordHash = await bcrypt.hash(password, 10);
      await client.query(
        `UPDATE users SET
          password_hash = $1,
          cgu_accepted_at = NOW(),
          cgu_version = '1.0',
          is_active = true
         WHERE email = $2`,
        [passwordHash, email]
      );
      console.log('Account updated successfully.');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query(
      `INSERT INTO users (
        email, password_hash, name, phone, department,
        referral_code, role, is_active,
        cgu_accepted_at, cgu_version,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, 'user', true,
        NOW(), '1.0',
        NOW(), NOW()
      )`,
      [email, passwordHash, name, phone, department, referralCode]
    );

    console.log('\n✅ Apple reviewer account created successfully!');
    console.log('---');
    console.log(`Email    : ${email}`);
    console.log(`Password : ${password}`);
    console.log(`Name     : ${name}`);
    console.log(`Dept     : ${department} (Paris)`);
    console.log('CGU      : accepted');
    console.log('---');
  } finally {
    client.release();
    await pool.end();
  }
}

seedAppleReviewer().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
