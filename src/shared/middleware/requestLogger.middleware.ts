import { Request, Response, NextFunction } from 'express';
import logger, { logRequest, logResponse } from '../../config/logger';
import { AuthTokenPayload } from '../types';

// Extend Express Request type to include user and timing
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Request logging middleware
 * Logs incoming requests and their responses with timing
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip logging for health checks and static files
  if (req.url === '/health' || req.url.startsWith('/static')) {
    return next();
  }

  // Record start time
  req.startTime = Date.now();

  // Log incoming request
  logRequest({
    method: req.method,
    url: req.originalUrl || req.url,
    userId: req.user?.userId,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent'),
  });

  // Capture response finish event
  res.on('finish', () => {
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;

    logResponse({
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTime,
      userId: req.user?.userId,
    });
  });

  next();
};

/**
 * Error logging middleware
 * Should be placed before error handler to log errors
 */
export const errorLogger = (
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl || req.url,
    userId: req.user?.userId,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
  });

  next(err);
};

export default requestLogger;
