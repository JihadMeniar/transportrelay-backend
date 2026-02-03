import { pool } from '../config/database';

// Clean up database connection after all tests
afterAll(async () => {
  await pool.end();
});

// Global timeout for tests
jest.setTimeout(30000);
