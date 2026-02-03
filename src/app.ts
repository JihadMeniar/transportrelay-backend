import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import * as dotenv from 'dotenv';
import { serverConfig } from './config';
import { swaggerSpec } from './config/swagger';
import { morganStream } from './config/logger';
import { errorHandler, notFoundHandler } from './shared/middleware';
import { requestLogger, errorLogger } from './shared/middleware/requestLogger.middleware';
import { generalLimiter } from './shared/middleware/rateLimiter.middleware';

// Import routes directly to avoid circular dependency issues with barrel exports
import authRoutes from './features/auth/auth.routes';
import ridesRoutes from './features/rides/rides.routes';
import usersRoutes from './features/users/users.routes';
import documentsRoutes from './features/documents/documents.routes';
import chatRoutes from './features/chat/chat.routes';
import subscriptionsRoutes from './features/subscriptions/subscriptions.routes';
import { subscriptionsController } from './features/subscriptions/subscriptions.controller';

dotenv.config();

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: serverConfig.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Stripe webhook needs raw body (must be before other body parsers)
app.post(
  `${serverConfig.apiPrefix}/subscriptions/webhook`,
  express.raw({ type: 'application/json' }),
  subscriptionsController.handleWebhook
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging with Morgan + Winston
const morganFormat = serverConfig.nodeEnv === 'production'
  ? 'combined'
  : 'dev';
app.use(morgan(morganFormat, { stream: morganStream }));

// Custom request/response logging
app.use(requestLogger);

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: serverConfig.nodeEnv,
    version: '1.0.0',
  });
});

// API root
app.get(serverConfig.apiPrefix, (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'TaxiRelay API v1',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// Swagger Documentation
app.use(
  `${serverConfig.apiPrefix}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TaxiRelay API Documentation',
  })
);

// Swagger JSON spec
app.get(`${serverConfig.apiPrefix}/docs.json`, (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use(`${serverConfig.apiPrefix}/auth`, authRoutes);
app.use(`${serverConfig.apiPrefix}/rides`, ridesRoutes);
app.use(`${serverConfig.apiPrefix}/users`, usersRoutes);
app.use(`${serverConfig.apiPrefix}/documents`, documentsRoutes);
app.use(`${serverConfig.apiPrefix}/chat`, chatRoutes);
app.use(`${serverConfig.apiPrefix}/subscriptions`, subscriptionsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error logging (before error handler)
app.use(errorLogger);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
