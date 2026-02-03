import http from 'http';
import app from './app';
import { serverConfig, testConnection, logger, logDatabase } from './config';
import { initializeWebSocket } from './websocket/wsServer';

const server = http.createServer(app);

// Initialize WebSocket server
initializeWebSocket(server);

// Start server
async function startServer() {
  try {
    logger.info('Starting TaxiRelay Backend Server...');

    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logDatabase('disconnected', { reason: 'Initial connection failed' });
      logger.error('Failed to connect to database');
      process.exit(1);
    }

    logDatabase('connected');

    // Start HTTP server
    server.listen(serverConfig.port, () => {
      logger.info('Server started successfully', {
        environment: serverConfig.nodeEnv,
        port: serverConfig.port,
        apiUrl: `http://localhost:${serverConfig.port}${serverConfig.apiPrefix}`,
        docsUrl: `http://localhost:${serverConfig.port}${serverConfig.apiPrefix}/docs`,
        healthUrl: `http://localhost:${serverConfig.port}/health`,
        websocketUrl: `ws://localhost:${serverConfig.port}/socket.io`,
      });

      // Also log to console for development visibility
      if (serverConfig.nodeEnv === 'development') {
        console.log('\n✅ Server started successfully!');
        console.log(`🌍 Environment: ${serverConfig.nodeEnv}`);
        console.log(`🔗 Server URL: http://localhost:${serverConfig.port}`);
        console.log(`🔗 API URL: http://localhost:${serverConfig.port}${serverConfig.apiPrefix}`);
        console.log(`📚 API Docs: http://localhost:${serverConfig.port}${serverConfig.apiPrefix}/docs`);
        console.log(`💚 Health Check: http://localhost:${serverConfig.port}/health`);
        console.log(`🔌 WebSocket: ws://localhost:${serverConfig.port}/socket.io`);
        console.log('\n⏳ Ready to accept connections...\n');
      }
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${serverConfig.port} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`Port ${serverConfig.port} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error instanceof Error ? error.message : error });
    process.exit(1);
  }
}

// Graceful shutdown
function gracefulShutdown(signal: string) {
  logger.warn(`Received ${signal}, shutting down gracefully...`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection', { reason, promise: String(promise) });
  process.exit(1);
});

// Start the server
startServer();
