import rateLimit from 'express-rate-limit';
import { rateLimitConfig } from '../../config';

// Skip rate limiting during tests
const isTest = process.env.NODE_ENV === 'test';
const skipHandler = () => isTest;

/**
 * General rate limiter for all API endpoints
 */
export const generalLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipHandler,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipHandler,
});

/**
 * Upload rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: {
    error: 'Too many upload requests, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipHandler,
});
