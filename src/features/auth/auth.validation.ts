import { z } from 'zod';

/**
 * Validation schema for user registration
 */
export const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .min(1, 'Email is required')
      .max(255, 'Email is too long'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password is too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    name: z
      .string()
      .min(1, 'Name is required')
      .max(255, 'Name is too long')
      .trim(),
    phone: z
      .string()
      .max(20, 'Phone number is too long')
      .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number format')
      .optional(),
    department: z
      .string()
      .min(1, 'Le département est requis')
      .max(3, 'Code département invalide')
      .regex(/^(0[1-9]|[1-8][0-9]|9[0-5]|97[1-6]|2[AB])$/, 'Code département invalide'),
    referralCode: z
      .string()
      .min(1, 'Le code de parrainage est requis')
      .max(20, 'Code de parrainage invalide')
      .transform((val) => val.toUpperCase().trim()),
  }),
});

/**
 * Validation schema for user login
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .min(1, 'Email is required'),
    password: z
      .string()
      .min(1, 'Password is required'),
  }),
});

/**
 * Validation schema for refresh token
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

/**
 * Validation schema for change password
 */
/**
 * Validation schema for accepting CGU
 */
export const acceptCguSchema = z.object({
  body: z.object({
    version: z
      .string()
      .max(20, 'Version is too long')
      .optional()
      .default('1.0'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(100, 'New password is too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'New password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
  }),
});
