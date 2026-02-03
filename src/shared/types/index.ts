/**
 * Central export for all TypeScript types
 * Barrel export pattern for clean imports
 */

// Ride types
export * from './ride.types';

// Chat types
export * from './chat.types';

// User types
export * from './user.types';

// Auth types
export * from './auth.types';

// Subscription types
export * from './subscription.types';

// Common response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  statusCode: number;
  details?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// Health check response
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: 'connected' | 'disconnected';
  version: string;
}
