-- Migration: Add priority user status
-- Priority users receive ride notifications 5 minutes before regular users

-- Add is_priority column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;

-- Create index for quick lookup of priority users
CREATE INDEX IF NOT EXISTS idx_users_is_priority ON users(is_priority) WHERE is_priority = true;

-- Comment
COMMENT ON COLUMN users.is_priority IS 'Priority users receive notifications 5 minutes before others';
