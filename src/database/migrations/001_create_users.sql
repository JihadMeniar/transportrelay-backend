-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'driver',
  is_active BOOLEAN DEFAULT true,
  stats_published INTEGER DEFAULT 0,
  stats_accepted INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on is_active
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Add comments
COMMENT ON TABLE users IS 'Users table for TaxiRelay application';
COMMENT ON COLUMN users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN users.email IS 'User email address (unique)';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.role IS 'User role: driver, admin';
COMMENT ON COLUMN users.stats_published IS 'Number of rides published by user';
COMMENT ON COLUMN users.stats_accepted IS 'Number of rides accepted by user';
COMMENT ON COLUMN users.rating IS 'User rating (0.00 to 5.00)';
