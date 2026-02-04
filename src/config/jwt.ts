import * as dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '90d',
  algorithm: 'HS256' as const,
};

// Validation
if (jwtConfig.secret.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security');
}

if (jwtConfig.refreshSecret.length < 32) {
  console.warn('⚠️  WARNING: JWT_REFRESH_SECRET should be at least 32 characters long for security');
}

if (process.env.NODE_ENV === 'production') {
  if (jwtConfig.secret === 'your-secret-key-change-in-production') {
    throw new Error('JWT_SECRET must be changed in production');
  }
  if (jwtConfig.refreshSecret === 'refresh-secret-key') {
    throw new Error('JWT_REFRESH_SECRET must be changed in production');
  }
}

export default jwtConfig;
