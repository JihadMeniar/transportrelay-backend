import winston from 'winston';
import path from 'path';

// Get NODE_ENV directly to avoid circular dependency with index.ts
const nodeEnv = process.env.NODE_ENV || 'development';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// JSON format for production (easier to parse by log aggregators)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format with colors for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} ${level}: ${message}`;
    if (Object.keys(metadata).length > 0 && !metadata.stack) {
      const metaStr = Object.entries(metadata)
        .filter(([key]) => key !== 'timestamp')
        .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`)
        .join(' ');
      if (metaStr) msg += ` | ${metaStr}`;
    }
    return msg;
  })
);

// Determine log level based on environment
const level = () => {
  const env = nodeEnv || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Create transports array
const transports: winston.transport[] = [];

// Always add console transport
transports.push(
  new winston.transports.Console({
    format: nodeEnv === 'production' ? jsonFormat : consoleFormat,
  })
);

// Add file transports in production
if (nodeEnv === 'production') {
  const logsDir = path.join(process.cwd(), 'logs');

  // All logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Error logs only
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logging integration
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logRequest = (req: {
  method: string;
  url: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}) => {
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    userId: req.userId || 'anonymous',
    ip: req.ip,
    userAgent: req.userAgent,
  });
};

export const logResponse = (req: {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
}) => {
  const level = req.statusCode >= 400 ? 'warn' : 'http';
  logger.log(level, 'Response sent', {
    method: req.method,
    url: req.url,
    statusCode: req.statusCode,
    responseTime: `${req.responseTime}ms`,
    userId: req.userId || 'anonymous',
  });
};

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

export const logAuth = (
  event: 'login' | 'logout' | 'register' | 'token_refresh' | 'password_change',
  userId: string,
  success: boolean,
  details?: Record<string, unknown>
) => {
  const level = success ? 'info' : 'warn';
  logger.log(level, `Auth event: ${event}`, {
    userId,
    success,
    ...details,
  });
};

export const logRide = (
  event: 'created' | 'accepted' | 'completed' | 'cancelled' | 'deleted',
  rideId: number,
  userId: string,
  details?: Record<string, unknown>
) => {
  logger.info(`Ride event: ${event}`, {
    rideId,
    userId,
    ...details,
  });
};

export const logChat = (
  event: 'message_sent' | 'message_deleted' | 'attachment_uploaded',
  rideId: number,
  userId: string,
  details?: Record<string, unknown>
) => {
  logger.info(`Chat event: ${event}`, {
    rideId,
    userId,
    ...details,
  });
};

export const logDocument = (
  event: 'uploaded' | 'downloaded' | 'deleted',
  documentId: string,
  userId: string,
  details?: Record<string, unknown>
) => {
  logger.info(`Document event: ${event}`, {
    documentId,
    userId,
    ...details,
  });
};

export const logDatabase = (
  event: 'connected' | 'disconnected' | 'query_error',
  details?: Record<string, unknown>
) => {
  const level = event === 'query_error' ? 'error' : 'info';
  logger.log(level, `Database event: ${event}`, details);
};

export const logWebSocket = (
  event: 'connected' | 'disconnected' | 'join_room' | 'leave_room' | 'message',
  socketId: string,
  userId?: string,
  details?: Record<string, unknown>
) => {
  logger.info(`WebSocket event: ${event}`, {
    socketId,
    userId,
    ...details,
  });
};

export default logger;
