/**
 * Chat Controller
 * HTTP request handlers for chat endpoints
 */

import { Response } from 'express';
import path from 'path';
import { AuthRequest } from '../../shared/middleware';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import * as chatService from './chat.service';
import { AppError } from '../../shared/middleware';

/**
 * Get messages for a ride
 * GET /api/chat/rides/:rideId/messages?page=1&limit=50
 */
export const getMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const rideId = parseInt(req.params.rideId);
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

  const result = await chatService.getMessagesByRideId(rideId, userId, page, limit);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Messages retrieved successfully',
  });
});

/**
 * Send a text message
 * POST /api/chat/rides/:rideId/messages
 */
export const sendTextMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const rideId = parseInt(req.params.rideId);
  const { content } = req.body;

  const message = await chatService.sendTextMessage(rideId, userId, content);

  res.status(201).json({
    success: true,
    data: { message },
    message: 'Message sent successfully',
  });
});

/**
 * Send a message with attachment
 * POST /api/chat/rides/:rideId/messages/attachment
 */
export const sendAttachment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const rideId = parseInt(req.params.rideId);
  const content = req.body.content || '';
  const file = req.file;

  if (!file) {
    throw new AppError(400, 'No file uploaded');
  }

  const message = await chatService.sendMessageWithAttachment(rideId, userId, content, file);

  res.status(201).json({
    success: true,
    data: { message },
    message: 'Message with attachment sent successfully',
  });
});

/**
 * Get a specific message by ID
 * GET /api/chat/messages/:messageId
 */
export const getMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const messageId = req.params.messageId;

  const message = await chatService.getMessageById(messageId, userId);

  res.status(200).json({
    success: true,
    data: { message },
    message: 'Message retrieved successfully',
  });
});

/**
 * Delete a message
 * DELETE /api/chat/messages/:messageId
 */
export const deleteMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const messageId = req.params.messageId;

  await chatService.deleteMessage(messageId, userId);

  res.status(200).json({
    success: true,
    data: null,
    message: 'Message deleted successfully',
  });
});

/**
 * Get message count for a ride
 * GET /api/chat/rides/:rideId/count
 */
export const getMessageCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const rideId = parseInt(req.params.rideId);

  const count = await chatService.getMessageCount(rideId, userId);

  res.status(200).json({
    success: true,
    data: { count },
    message: 'Message count retrieved successfully',
  });
});

/**
 * Download message attachment
 * GET /api/chat/messages/:messageId/attachment
 */
export const downloadAttachment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const messageId = req.params.messageId;

  const { filePath, fileName, mimeType } = await chatService.downloadAttachment(messageId, userId);

  // Convertir en chemin absolu pour res.sendFile
  const absolutePath = path.resolve(filePath);

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.sendFile(absolutePath);
});
