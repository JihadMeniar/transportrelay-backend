import { z } from 'zod';

/**
 * Validation schema for updating user profile
 */
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name must not be empty').max(255).optional(),
    phone: z.string().max(20).optional(),
    department: z
      .string()
      .max(3, 'Code département invalide')
      .regex(/^(0[1-9]|[1-8][0-9]|9[0-5]|97[1-6]|2[AB])$/, 'Code département invalide')
      .optional(),
  }),
});

/**
 * Validation schema for getting user by ID
 */
export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

/**
 * Validation schema for getting user stats
 */
export const getUserStatsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

/**
 * Validation schema for registering push token
 */
export const registerPushTokenSchema = z.object({
  body: z.object({
    pushToken: z.string().min(1, 'Push token is required'),
    platform: z.enum(['ios', 'android', 'web'], {
      errorMap: () => ({ message: 'Platform must be ios, android, or web' }),
    }),
  }),
});
