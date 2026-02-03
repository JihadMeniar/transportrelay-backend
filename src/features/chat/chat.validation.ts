/**
 * Chat Validation Schemas
 * Zod schemas for chat API request validation
 */

import { z } from 'zod';

/**
 * Get messages query parameters validation
 */
export const getMessagesSchema = z.object({
  params: z.object({
    rideId: z.string().regex(/^\d+$/, 'Invalid ride ID').transform(Number),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50'),
  }),
});

/**
 * Send text message validation
 */
export const sendTextMessageSchema = z.object({
  params: z.object({
    rideId: z.string().regex(/^\d+$/, 'Invalid ride ID').transform(Number),
  }),
  body: z.object({
    content: z
      .string()
      .min(1, 'Message content cannot be empty')
      .max(500, 'Message content cannot exceed 500 characters')
      .trim(),
  }),
});

/**
 * Send message with attachment validation
 */
export const sendAttachmentSchema = z.object({
  params: z.object({
    rideId: z.string().regex(/^\d+$/, 'Invalid ride ID').transform(Number),
  }),
  body: z.object({
    content: z.string().max(500, 'Message content cannot exceed 500 characters').optional().default(''),
  }),
});

/**
 * Get message by ID validation
 */
export const getMessageSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID'),
  }),
});

/**
 * Delete message validation
 */
export const deleteMessageSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID'),
  }),
});

/**
 * Get message count validation
 */
export const getMessageCountSchema = z.object({
  params: z.object({
    rideId: z.string().regex(/^\d+$/, 'Invalid ride ID').transform(Number),
  }),
});

/**
 * Download attachment validation
 */
export const downloadAttachmentSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID'),
  }),
});
