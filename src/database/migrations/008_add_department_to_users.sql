-- Migration: Add department to users table
-- Allows filtering courses by user's department

ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(10);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- Comment for documentation
COMMENT ON COLUMN users.department IS 'Department code (e.g., 75, 92, 93) for filtering courses';
