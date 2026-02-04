import * as dotenv from 'dotenv';

dotenv.config();

export { pool, testConnection } from './database';
export { jwtConfig } from './jwt';
export { uploadDocuments, uploadAttachment, uploadSingle } from './multer';
export { default as logger, logAuth, logRide, logChat, logDocument, logDatabase, logWebSocket, logError } from './logger';
export { swaggerSpec } from './swagger';

// Parse CORS origins (supports comma-separated list for production)
const parseCorsOrigins = (origins: string | undefined, defaultOrigin: string): string | string[] => {
  if (!origins) return defaultOrigin;
  const parsed = origins.split(',').map(o => o.trim()).filter(Boolean);
  return parsed.length === 1 ? parsed[0] : parsed;
};

// Server configuration
export const serverConfig = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api',
  corsOrigin: parseCorsOrigins(process.env.CORS_ORIGIN, 'http://localhost:8081'),
  wsCorsOrigin: parseCorsOrigins(process.env.WS_CORS_ORIGIN, 'http://localhost:8081'),
  adminSeedReferralCode: process.env.ADMIN_SEED_REFERRAL_CODE || 'TRANSPORTRELAY2025',
};

// Validation configuration
export const validationConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
  maxDocumentsPerRide: parseInt(process.env.MAX_DOCUMENTS_PER_RIDE || '5'),
  maxChatAttachmentSize: parseInt(process.env.MAX_CHAT_ATTACHMENT_SIZE || '10485760'),
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
};

// Bcrypt configuration
export const bcryptConfig = {
  saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10'),
};

export default {
  server: serverConfig,
  validation: validationConfig,
  rateLimit: rateLimitConfig,
  bcrypt: bcryptConfig,
};
