/**
 * Chat Routes
 * Express routes for chat endpoints
 */

import { Router } from 'express';
import { authenticate } from '../../shared/middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { uploadAttachment } from '../../config/multer';
import * as chatController from './chat.controller';
import * as chatValidation from './chat.validation';

const router = Router();

/**
 * Get messages for a ride (with pagination)
 * GET /api/chat/rides/:rideId/messages?page=1&limit=50
 */
router.get(
  '/rides/:rideId/messages',
  authenticate,
  validate(chatValidation.getMessagesSchema),
  chatController.getMessages
);

/**
 * Send a text message
 * POST /api/chat/rides/:rideId/messages
 */
router.post(
  '/rides/:rideId/messages',
  authenticate,
  validate(chatValidation.sendTextMessageSchema),
  chatController.sendTextMessage
);

/**
 * Send a message with attachment
 * POST /api/chat/rides/:rideId/messages/attachment
 */
router.post(
  '/rides/:rideId/messages/attachment',
  authenticate,
  uploadAttachment.single('file'),
  validate(chatValidation.sendAttachmentSchema),
  chatController.sendAttachment
);

/**
 * Get message count for a ride
 * GET /api/chat/rides/:rideId/count
 */
router.get(
  '/rides/:rideId/count',
  authenticate,
  validate(chatValidation.getMessageCountSchema),
  chatController.getMessageCount
);

/**
 * Get a specific message by ID
 * GET /api/chat/messages/:messageId
 */
router.get(
  '/messages/:messageId',
  authenticate,
  validate(chatValidation.getMessageSchema),
  chatController.getMessage
);

/**
 * Delete a message
 * DELETE /api/chat/messages/:messageId
 */
router.delete(
  '/messages/:messageId',
  authenticate,
  validate(chatValidation.deleteMessageSchema),
  chatController.deleteMessage
);

/**
 * Download message attachment
 * GET /api/chat/messages/:messageId/attachment
 */
router.get(
  '/messages/:messageId/attachment',
  authenticate,
  validate(chatValidation.downloadAttachmentSchema),
  chatController.downloadAttachment
);

export default router;
