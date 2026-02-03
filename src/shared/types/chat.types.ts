/**
 * Chat types - synchronized with frontend
 * Frontend path: taxirelay/src/shared/types/chat.ts
 */

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  uri: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export type SenderRole = 'publisher' | 'taker';
export type MessageType = 'text' | 'attachment';

export interface ChatMessage {
  id: string;
  rideId: number;
  senderId: string;
  senderRole: SenderRole;
  messageType: MessageType;
  content: string;
  attachment: MessageAttachment | null;
  createdAt: Date;
}

// DTO for creating a message
export interface CreateMessageDTO {
  rideId: number;
  content: string;
  messageType: MessageType;
}

// DTO for creating a message with attachment
export interface CreateMessageWithAttachmentDTO {
  rideId: number;
  content: string;
  file: Express.Multer.File;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'join_ride' | 'leave_ride' | 'new_message' | 'typing' | 'stop_typing' | 'error';
  rideId: number;
  message?: ChatMessage;
  userId?: string;
  error?: string;
}

// Typing indicator
export interface TypingIndicator {
  rideId: number;
  userId: string;
  userName: string;
}

// Paginated messages
export interface PaginatedMessages {
  messages: ChatMessage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Database row interface (matches PostgreSQL schema)
export interface ChatMessageRow {
  id: string;
  ride_id: number;
  sender_id: string;
  sender_role: string;
  message_type: string;
  content: string;
  created_at: Date;
}

export interface MessageAttachmentRow {
  id: string;
  message_id: string;
  file_name: string;
  uri: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: Date;
}
