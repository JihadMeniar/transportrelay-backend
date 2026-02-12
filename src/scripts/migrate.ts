import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

/**
 * Run all SQL migration files
 */
async function runMigrations() {
  console.log('Running database migrations...\n');

  const migrationsDir = path.join(process.cwd(), 'src/database/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  try {
    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      console.log(`Executing ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await pool.query(sql);
      console.log(`${file} completed`);
    }

    console.log('\nAll migrations completed successfully!');
  } catch (error) {
    console.error('\nMigration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
