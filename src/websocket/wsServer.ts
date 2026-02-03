/**
 * WebSocket Server
 * Socket.io server setup with JWT authentication
 */

import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';
import { handleConnection } from './wsHandlers';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
  role?: string;
}

interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Initialize WebSocket server with Socket.io
 */
export function initializeWebSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  /**
   * Authentication middleware
   * Verify JWT token before allowing connection
   */
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, jwtConfig.secret) as AuthTokenPayload;

      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.email = decoded.email;
      socket.role = decoded.role;

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(new Error('Authentication error: Token expired'));
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return next(new Error('Authentication error: Invalid token'));
      }
      return next(new Error('Authentication error'));
    }
  });

  /**
   * Handle new connections
   */
  io.on('connection', (socket: AuthenticatedSocket) => {
    handleConnection(io, socket);
  });

  console.log('✅ WebSocket server initialized');

  return io;
}

export default initializeWebSocket;
