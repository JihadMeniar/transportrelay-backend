/**
 * Chat Repository
 * Database access layer for chat messages and attachments
 */

import { pool } from '../../database/connection';
import { ChatMessage, MessageAttachment } from '../../shared/types';
import { AppError } from '../../shared/middleware';

interface MessageRow {
  id: string;
  ride_id: number;
  sender_id: string;
  sender_role: 'publisher' | 'taker';
  message_type: 'text' | 'attachment';
  content: string;
  created_at: Date;
}

interface AttachmentRow {
  id: string;
  message_id: string;
  file_name: string;
  uri: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: Date;
}

/**
 * Convert database row to ChatMessage object
 */
const rowToMessage = (row: MessageRow, attachment?: MessageAttachment): ChatMessage => ({
  id: row.id,
  rideId: row.ride_id,
  senderId: row.sender_id,
  senderRole: row.sender_role,
  messageType: row.message_type,
  content: row.content,
  attachment: attachment || null,
  createdAt: row.created_at,
});

/**
 * Convert database row to MessageAttachment object
 */
const rowToAttachment = (row: AttachmentRow): MessageAttachment => ({
  id: row.id,
  messageId: row.message_id,
  fileName: row.file_name,
  uri: row.uri,
  filePath: row.file_path,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  uploadedAt: row.uploaded_at,
});

/**
 * Find all messages for a specific ride with pagination
 */
export async function findMessagesByRideId(
  rideId: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ messages: ChatMessage[]; total: number }> {
  try {
    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM chat_messages WHERE ride_id = $1';
    const countResult = await pool.query(countQuery, [rideId]);
    const total = parseInt(countResult.rows[0].count);

    // Get messages with attachments
    const query = `
      SELECT
        m.*,
        a.id as attachment_id,
        a.file_name,
        a.uri,
        a.file_path,
        a.mime_type,
        a.size_bytes,
        a.uploaded_at
      FROM chat_messages m
      LEFT JOIN message_attachments a ON m.id = a.message_id
      WHERE m.ride_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [rideId, limit, offset]);

    const messages = result.rows.map((row) => {
      const attachment = row.attachment_id
        ? rowToAttachment({
            id: row.attachment_id,
            message_id: row.id,
            file_name: row.file_name,
            uri: row.uri,
            file_path: row.file_path,
            mime_type: row.mime_type,
            size_bytes: row.size_bytes,
            uploaded_at: row.uploaded_at,
          })
        : undefined;

      return rowToMessage(row, attachment);
    });

    return { messages, total };
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw new AppError(500, 'Failed to fetch messages');
  }
}

/**
 * Find a specific message by ID
 */
export async function findMessageById(messageId: string): Promise<ChatMessage | null> {
  try {
    const query = `
      SELECT
        m.*,
        a.id as attachment_id,
        a.file_name,
        a.uri,
        a.file_path,
        a.mime_type,
        a.size_bytes,
        a.uploaded_at
      FROM chat_messages m
      LEFT JOIN message_attachments a ON m.id = a.message_id
      WHERE m.id = $1
    `;

    const result = await pool.query(query, [messageId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const attachment = row.attachment_id
      ? rowToAttachment({
          id: row.attachment_id,
          message_id: row.id,
          file_name: row.file_name,
          uri: row.uri,
          file_path: row.file_path,
          mime_type: row.mime_type,
          size_bytes: row.size_bytes,
          uploaded_at: row.uploaded_at,
        })
      : undefined;

    return rowToMessage(row, attachment);
  } catch (error) {
    console.error('Error fetching message:', error);
    throw new AppError(500, 'Failed to fetch message');
  }
}

/**
 * Create a new text message
 */
export async function createTextMessage(data: {
  rideId: number;
  senderId: string;
  senderRole: 'publisher' | 'taker';
  content: string;
}): Promise<ChatMessage> {
  try {
    const query = `
      INSERT INTO chat_messages (ride_id, sender_id, sender_role, message_type, content)
      VALUES ($1, $2, $3, 'text', $4)
      RETURNING *
    `;

    const values = [data.rideId, data.senderId, data.senderRole, data.content];
    const result = await pool.query(query, values);

    return rowToMessage(result.rows[0]);
  } catch (error) {
    console.error('Error creating text message:', error);
    throw new AppError(500, 'Failed to create message');
  }
}

/**
 * Create a new message with attachment
 */
export async function createMessageWithAttachment(
  messageData: {
    rideId: number;
    senderId: string;
    senderRole: 'publisher' | 'taker';
    content: string;
  },
  attachmentData: {
    fileName: string;
    uri: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
  }
): Promise<ChatMessage> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create message
    const messageQuery = `
      INSERT INTO chat_messages (ride_id, sender_id, sender_role, message_type, content)
      VALUES ($1, $2, $3, 'attachment', $4)
      RETURNING *
    `;
    const messageValues = [
      messageData.rideId,
      messageData.senderId,
      messageData.senderRole,
      messageData.content,
    ];
    const messageResult = await client.query(messageQuery, messageValues);
    const message = messageResult.rows[0];

    // Create attachment
    const attachmentQuery = `
      INSERT INTO message_attachments (message_id, file_name, uri, file_path, mime_type, size_bytes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const attachmentValues = [
      message.id,
      attachmentData.fileName,
      attachmentData.uri,
      attachmentData.filePath,
      attachmentData.mimeType,
      attachmentData.sizeBytes,
    ];
    const attachmentResult = await client.query(attachmentQuery, attachmentValues);
    const attachment = rowToAttachment(attachmentResult.rows[0]);

    await client.query('COMMIT');

    return rowToMessage(message, attachment);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating message with attachment:', error);
    throw new AppError(500, 'Failed to create message with attachment');
  } finally {
    client.release();
  }
}

/**
 * Delete a message and its attachment (if any)
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete attachment first (if exists)
    await client.query('DELETE FROM message_attachments WHERE message_id = $1', [messageId]);

    // Delete message
    const result = await client.query('DELETE FROM chat_messages WHERE id = $1', [messageId]);

    await client.query('COMMIT');

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting message:', error);
    throw new AppError(500, 'Failed to delete message');
  } finally {
    client.release();
  }
}

/**
 * Get message count for a ride
 */
export async function getMessageCountByRideId(rideId: number): Promise<number> {
  try {
    const query = 'SELECT COUNT(*) FROM chat_messages WHERE ride_id = $1';
    const result = await pool.query(query, [rideId]);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting message count:', error);
    throw new AppError(500, 'Failed to get message count');
  }
}

/**
 * Get attachment by message ID
 */
export async function findAttachmentByMessageId(messageId: string): Promise<MessageAttachment | null> {
  try {
    const query = 'SELECT * FROM message_attachments WHERE message_id = $1';
    const result = await pool.query(query, [messageId]);

    if (result.rows.length === 0) {
      return null;
    }

    return rowToAttachment(result.rows[0]);
  } catch (error) {
    console.error('Error fetching attachment:', error);
    throw new AppError(500, 'Failed to fetch attachment');
  }
}
