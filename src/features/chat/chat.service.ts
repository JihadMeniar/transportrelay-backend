/**
 * Chat Service
 * Business logic for chat messages and attachments
 */

import * as chatRepository from './chat.repository';
import { ridesRepository } from '../rides/rides.repository';
import { usersRepository } from '../users/users.repository';
import { ChatMessage } from '../../shared/types';
import { AppError } from '../../shared/middleware';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sendChatMessageNotification } from '../../services/push-notifications.service';

/**
 * Check if user has access to chat for a specific ride
 * Only publisher and taker of an accepted ride can access chat
 */
async function validateChatAccess(rideId: number, userId: string): Promise<{ role: 'publisher' | 'taker' }> {
  const ride = await ridesRepository.findById(rideId);

  if (!ride) {
    throw new AppError(404, 'Ride not found');
  }

  // Chat is only available for accepted rides
  if (ride.status === 'available') {
    throw new AppError(403, 'Chat is not available for rides that have not been accepted');
  }

  // Check if user is publisher or taker
  if (ride.publishedBy === userId) {
    return { role: 'publisher' };
  }

  if (ride.acceptedBy === userId) {
    return { role: 'taker' };
  }

  throw new AppError(403, 'You do not have access to this chat');
}

/**
 * Get messages for a ride with pagination
 */
export async function getMessagesByRideId(
  rideId: number,
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: ChatMessage[]; total: number; page: number; totalPages: number }> {
  // Validate access
  await validateChatAccess(rideId, userId);

  const offset = (page - 1) * limit;
  const { messages, total } = await chatRepository.findMessagesByRideId(rideId, limit, offset);

  const totalPages = Math.ceil(total / limit);

  return {
    messages,
    total,
    page,
    totalPages,
  };
}

/**
 * Send a text message
 */
export async function sendTextMessage(
  rideId: number,
  userId: string,
  content: string
): Promise<ChatMessage> {
  // Validate access and get user role
  const { role } = await validateChatAccess(rideId, userId);

  // Validate content length
  if (!content || content.trim().length === 0) {
    throw new AppError(400, 'Message content cannot be empty');
  }

  if (content.length > 500) {
    throw new AppError(400, 'Message content cannot exceed 500 characters');
  }

  // Create message
  const message = await chatRepository.createTextMessage({
    rideId,
    senderId: userId,
    senderRole: role,
    content: content.trim(),
  });

  // Send push notification to recipient
  await sendPushNotificationForMessage(rideId, userId, content.trim(), message.id);

  return message;
}

/**
 * Send a message with file attachment
 */
export async function sendMessageWithAttachment(
  rideId: number,
  userId: string,
  content: string,
  file: any
): Promise<ChatMessage> {
  try {
    // Validate access and get user role
    const { role } = await validateChatAccess(rideId, userId);

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      await deleteFile(file.path);
      throw new AppError(400, 'File size cannot exceed 10MB');
    }

    // Validate content (optional for attachments, but limit length if provided)
    const messageContent = content?.trim() || `Sent ${file.originalname}`;
    if (messageContent.length > 500) {
      await deleteFile(file.path);
      throw new AppError(400, 'Message content cannot exceed 500 characters');
    }

    // Create message with attachment
    const uri = `/api/chat/attachments/${path.basename(file.path)}`;
    const message = await chatRepository.createMessageWithAttachment(
      {
        rideId,
        senderId: userId,
        senderRole: role,
        content: messageContent,
      },
      {
        fileName: file.originalname,
        uri,
        filePath: file.path,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      }
    );

    // Send push notification to recipient
    const notificationContent = messageContent || `📎 ${file.originalname}`;
    await sendPushNotificationForMessage(rideId, userId, notificationContent, message.id);

    return message;
  } catch (error) {
    // Clean up uploaded file on error
    if (file?.path) {
      await deleteFile(file.path);
    }
    throw error;
  }
}

/**
 * Get a specific message by ID
 */
export async function getMessageById(messageId: string, userId: string): Promise<ChatMessage> {
  const message = await chatRepository.findMessageById(messageId);

  if (!message) {
    throw new AppError(404, 'Message not found');
  }

  // Validate access to the ride
  await validateChatAccess(message.rideId, userId);

  return message;
}

/**
 * Delete a message
 * Only the sender can delete their own message
 */
export async function deleteMessage(messageId: string, userId: string): Promise<void> {
  const message = await chatRepository.findMessageById(messageId);

  if (!message) {
    throw new AppError(404, 'Message not found');
  }

  // Check if user is the sender
  if (message.senderId !== userId) {
    throw new AppError(403, 'You can only delete your own messages');
  }

  // Delete attachment file if exists
  if (message.attachment) {
    await deleteFile(message.attachment.filePath);
  }

  // Delete message from database
  await chatRepository.deleteMessage(messageId);
}

/**
 * Get message count for a ride
 */
export async function getMessageCount(rideId: number, userId: string): Promise<number> {
  // Validate access
  await validateChatAccess(rideId, userId);

  return chatRepository.getMessageCountByRideId(rideId);
}

/**
 * Download attachment file
 */
export async function downloadAttachment(
  messageId: string,
  userId: string
): Promise<{ filePath: string; fileName: string; mimeType: string }> {
  const message = await chatRepository.findMessageById(messageId);

  if (!message) {
    throw new AppError(404, 'Message not found');
  }

  // Validate access to the ride
  await validateChatAccess(message.rideId, userId);

  if (!message.attachment) {
    throw new AppError(404, 'Message has no attachment');
  }

  // Check if file exists
  try {
    await fs.access(message.attachment.filePath);
  } catch {
    throw new AppError(404, 'Attachment file not found');
  }

  return {
    filePath: message.attachment.filePath,
    fileName: message.attachment.fileName,
    mimeType: message.attachment.mimeType,
  };
}

/**
 * Helper: Delete a file from filesystem
 */
async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw - file might already be deleted or not exist
  }
}

/**
 * Helper: Send push notification for a new message
 */
async function sendPushNotificationForMessage(
  rideId: number,
  senderId: string,
  content: string,
  messageId: string
): Promise<void> {
  try {
    // Get ride to find the recipient
    const ride = await ridesRepository.findById(rideId);
    if (!ride) return;

    // Determine recipient (the other person in the chat)
    const recipientId = ride.publishedBy === senderId ? ride.acceptedBy : ride.publishedBy;
    if (!recipientId) return;

    // Get sender's name
    const senderUser = await usersRepository.findById(senderId);
    const senderName = senderUser?.name || 'Utilisateur';

    // Send push notification
    await sendChatMessageNotification(
      recipientId,
      senderName,
      content,
      rideId,
      messageId
    );
  } catch (error) {
    // Don't throw - push notification failure shouldn't block message sending
    console.error('[Chat] Error sending push notification:', error);
  }
}
