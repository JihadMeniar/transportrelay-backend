/**
 * Push Notifications Service
 * Handles sending push notifications via Expo Push API
 */

import { usersRepository } from '../features/users/users.repository';

// Expo Push API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotificationToUser(
  userId: string,
  notification: PushNotificationPayload
): Promise<boolean> {
  try {
    // Get user's active push tokens
    const tokens = await usersRepository.getActivePushTokens(userId);

    if (tokens.length === 0) {
      console.log(`[Push] No active push tokens for user ${userId}`);
      return false;
    }

    // Send to all user's devices
    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: notification.sound ?? 'default',
      badge: notification.badge,
      channelId: notification.channelId,
      priority: 'high',
    }));

    await sendPushNotifications(messages);
    return true;
  } catch (error) {
    console.error(`[Push] Error sending notification to user ${userId}:`, error);
    return false;
  }
}

/**
 * Send push notifications to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  notification: PushNotificationPayload
): Promise<void> {
  const allTokens: string[] = [];

  // Collect all tokens
  for (const userId of userIds) {
    const tokens = await usersRepository.getActivePushTokens(userId);
    allTokens.push(...tokens);
  }

  if (allTokens.length === 0) {
    console.log('[Push] No active push tokens for any of the specified users');
    return;
  }

  // Build messages
  const messages: ExpoPushMessage[] = allTokens.map(token => ({
    to: token,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    sound: notification.sound ?? 'default',
    badge: notification.badge,
    channelId: notification.channelId,
    priority: 'high',
  }));

  await sendPushNotifications(messages);
}

/**
 * Send push notifications via Expo Push API
 */
async function sendPushNotifications(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) {
    return [];
  }

  try {
    console.log(`[Push] Sending ${messages.length} notification(s)...`);

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Push] Expo API error:', response.status, errorText);
      throw new Error(`Expo Push API error: ${response.status}`);
    }

    const result = await response.json() as { data?: ExpoPushTicket[] };
    const tickets: ExpoPushTicket[] = result.data || [];

    // Log any errors
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'error') {
        console.error(`[Push] Error for message ${index}:`, ticket.message, ticket.details);

        // Handle specific errors
        if (ticket.details?.error === 'DeviceNotRegistered') {
          // Token is invalid - should deactivate it
          const token = messages[index]?.to;
          if (token) {
            deactivateInvalidToken(token);
          }
        }
      }
    });

    console.log(`[Push] Successfully sent ${tickets.filter(t => t.status === 'ok').length}/${tickets.length} notifications`);
    return tickets;
  } catch (error) {
    console.error('[Push] Failed to send notifications:', error);
    throw error;
  }
}

/**
 * Deactivate an invalid push token
 */
async function deactivateInvalidToken(token: string): Promise<void> {
  try {
    const { pool } = await import('../config/database');
    await pool.query(
      `UPDATE push_tokens SET is_active = false, updated_at = NOW() WHERE push_token = $1`,
      [token]
    );
    console.log(`[Push] Deactivated invalid token: ${token.substring(0, 20)}...`);
  } catch (error) {
    console.error('[Push] Error deactivating token:', error);
  }
}

/**
 * Send chat message notification
 */
export async function sendChatMessageNotification(
  recipientUserId: string,
  senderName: string,
  messagePreview: string,
  rideId: number,
  messageId: string
): Promise<void> {
  await sendPushNotificationToUser(recipientUserId, {
    title: `Message de ${senderName}`,
    body: messagePreview.length > 100 ? messagePreview.substring(0, 97) + '...' : messagePreview,
    data: {
      type: 'chat_message',
      rideId,
      messageId,
    },
    channelId: 'chat',
    sound: 'default',
  });
}

/**
 * Send ride accepted notification
 */
export async function sendRideAcceptedNotification(
  publisherUserId: string,
  takerName: string,
  rideId: number
): Promise<void> {
  await sendPushNotificationToUser(publisherUserId, {
    title: 'Course acceptée !',
    body: `${takerName} a accepté votre course`,
    data: {
      type: 'ride_accepted',
      rideId,
    },
    channelId: 'rides',
    sound: 'default',
  });
}

/**
 * Send ride status update notification
 */
export async function sendRideStatusNotification(
  userId: string,
  status: string,
  rideId: number
): Promise<void> {
  const statusMessages: Record<string, string> = {
    completed: 'La course a été terminée',
    cancelled: 'La course a été annulée',
  };

  const message = statusMessages[status];
  if (!message) return;

  await sendPushNotificationToUser(userId, {
    title: 'Mise à jour de course',
    body: message,
    data: {
      type: 'ride_status',
      rideId,
      status,
    },
    channelId: 'rides',
    sound: 'default',
  });
}

/**
 * Send notification to all users in a department when a new ride is published
 */
export async function sendNewRideNotificationToDepartment(
  department: string,
  publisherUserId: string,
  rideId: number,
  zone: string,
  distance: string
): Promise<void> {
  try {
    // Get all push tokens for users in this department (excluding the publisher)
    const tokens = await usersRepository.getPushTokensByDepartment(department, publisherUserId);

    if (tokens.length === 0) {
      console.log(`[Push] No active push tokens for department ${department}`);
      return;
    }

    // Build messages
    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      title: `Nouvelle course dans le ${department}`,
      body: `Zone: ${zone} - Distance: ${distance}`,
      data: {
        type: 'new_ride',
        rideId,
        department,
      },
      sound: 'default',
      channelId: 'rides',
      priority: 'high',
    }));

    await sendPushNotifications(messages);
    console.log(`[Push] Sent new ride notification to ${tokens.length} users in department ${department}`);
  } catch (error) {
    console.error(`[Push] Error sending department notification:`, error);
  }
}

export default {
  sendPushNotificationToUser,
  sendPushNotificationToUsers,
  sendChatMessageNotification,
  sendRideAcceptedNotification,
  sendRideStatusNotification,
  sendNewRideNotificationToDepartment,
};
