import { pool } from '../src/config/database';
import bcrypt from 'bcrypt';

/**
 * Seed database with initial data
 */
async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const testUsers = [
      {
        email: 'jean.dupont@email.com',
        name: 'Jean Dupont',
        phone: '0612345678',
        department: '75',
      },
      {
        email: 'marie.martin@email.com',
        name: 'Marie Martin',
        phone: '0623456789',
        department: '92',
      },
      {
        email: 'pierre.bernard@email.com',
        name: 'Pierre Bernard',
        phone: '0634567890',
        department: '93',
      },
    ];

    for (const user of testUsers) {
      // Check if user already exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO users (email, password_hash, name, phone, department, role, is_active)
           VALUES ($1, $2, $3, $4, $5, 'user', true)`,
          [user.email, hashedPassword, user.name, user.phone, user.department]
        );
        console.log(`✅ Created user: ${user.email}`);
      } else {
        console.log(`⏭️  User already exists: ${user.email}`);
      }
    }

    console.log('\n✨ Seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed
seed().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
