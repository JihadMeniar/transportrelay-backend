/**
 * WebSocket Event Handlers
 * Handles real-time chat events via Socket.io
 */

import { Server, Socket } from 'socket.io';
import * as chatRepository from '../features/chat/chat.repository';
import { ridesRepository } from '../features/rides/rides.repository';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * Validate that user has access to a ride's chat
 */
async function validateRideAccess(rideId: number, userId: string): Promise<boolean> {
  try {
    const ride = await ridesRepository.findById(rideId);

    if (!ride) {
      return false;
    }

    // Chat is only available for accepted rides
    if (ride.status === 'available') {
      return false;
    }

    // User must be publisher or taker
    return ride.publishedBy === userId || ride.acceptedBy === userId;
  } catch (error) {
    console.error('Error validating ride access:', error);
    return false;
  }
}

/**
 * Get room name for a ride
 */
function getRoomName(rideId: number): string {
  return `ride_${rideId}`;
}

/**
 * Handle new WebSocket connection
 */
export function handleConnection(io: Server, socket: AuthenticatedSocket) {
  const userId = socket.userId;

  console.log(`✅ WebSocket client connected: ${socket.id} (User: ${userId})`);

  /**
   * JOIN_RIDE - User joins a ride's chat room
   */
  socket.on('join_ride', async (data: { rideId: number }) => {
    try {
      const { rideId } = data;

      if (!userId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Validate access
      const hasAccess = await validateRideAccess(rideId, userId);
      if (!hasAccess) {
        socket.emit('error', { message: 'You do not have access to this ride chat' });
        return;
      }

      // Join the room
      const roomName = getRoomName(rideId);
      await socket.join(roomName);

      console.log(`User ${userId} joined room ${roomName}`);

      // Notify user
      socket.emit('joined_ride', {
        rideId,
        message: `Joined chat for ride ${rideId}`,
      });

      // Notify others in the room
      socket.to(roomName).emit('user_joined', {
        userId,
        rideId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error joining ride:', error);
      socket.emit('error', { message: 'Failed to join ride chat' });
    }
  });

  /**
   * LEAVE_RIDE - User leaves a ride's chat room
   */
  socket.on('leave_ride', async (data: { rideId: number }) => {
    try {
      const { rideId } = data;
      const roomName = getRoomName(rideId);

      await socket.leave(roomName);

      console.log(`User ${userId} left room ${roomName}`);

      // Notify user
      socket.emit('left_ride', {
        rideId,
        message: `Left chat for ride ${rideId}`,
      });

      // Notify others in the room
      socket.to(roomName).emit('user_left', {
        userId,
        rideId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error leaving ride:', error);
      socket.emit('error', { message: 'Failed to leave ride chat' });
    }
  });

  /**
   * NEW_MESSAGE - Broadcast new message to ride chat
   * This is called after a message is successfully created via REST API
   */
  socket.on('new_message', async (data: { rideId: number; messageId: string }) => {
    try {
      const { rideId, messageId } = data;

      if (!userId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Validate access
      const hasAccess = await validateRideAccess(rideId, userId);
      if (!hasAccess) {
        socket.emit('error', { message: 'You do not have access to this ride chat' });
        return;
      }

      // Get the message from database
      const message = await chatRepository.findMessageById(messageId);

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Broadcast to room (including sender for confirmation)
      const roomName = getRoomName(rideId);
      io.to(roomName).emit('message_received', {
        message,
        timestamp: new Date().toISOString(),
      });

      console.log(`Message broadcast to room ${roomName}: ${messageId}`);
    } catch (error) {
      console.error('Error broadcasting message:', error);
      socket.emit('error', { message: 'Failed to broadcast message' });
    }
  });

  /**
   * TYPING - User is typing
   */
  socket.on('typing', async (data: { rideId: number }) => {
    try {
      const { rideId } = data;

      if (!userId) {
        return;
      }

      // Validate access
      const hasAccess = await validateRideAccess(rideId, userId);
      if (!hasAccess) {
        return;
      }

      // Broadcast to others in the room (not sender)
      const roomName = getRoomName(rideId);
      socket.to(roomName).emit('user_typing', {
        userId,
        rideId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling typing event:', error);
    }
  });

  /**
   * STOP_TYPING - User stopped typing
   */
  socket.on('stop_typing', async (data: { rideId: number }) => {
    try {
      const { rideId } = data;

      if (!userId) {
        return;
      }

      // Validate access
      const hasAccess = await validateRideAccess(rideId, userId);
      if (!hasAccess) {
        return;
      }

      // Broadcast to others in the room (not sender)
      const roomName = getRoomName(rideId);
      socket.to(roomName).emit('user_stop_typing', {
        userId,
        rideId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling stop typing event:', error);
    }
  });

  /**
   * RIDE_STATUS_UPDATED - Notify when ride status changes
   * Called by the backend when a ride status is updated
   */
  socket.on('ride_status_updated', async (data: { rideId: number; status: string }) => {
    try {
      const { rideId, status } = data;

      // Broadcast to room
      const roomName = getRoomName(rideId);
      io.to(roomName).emit('status_updated', {
        rideId,
        status,
        timestamp: new Date().toISOString(),
      });

      console.log(`Ride ${rideId} status updated to ${status}`);
    } catch (error) {
      console.error('Error broadcasting ride status update:', error);
    }
  });

  /**
   * RIDE_ACCEPTED - Notify when ride is accepted
   * Called by the backend when a ride is accepted
   */
  socket.on('ride_accepted', async (data: { rideId: number; acceptedBy: string }) => {
    try {
      const { rideId, acceptedBy } = data;

      // Broadcast to room
      const roomName = getRoomName(rideId);
      io.to(roomName).emit('ride_accepted_notification', {
        rideId,
        acceptedBy,
        timestamp: new Date().toISOString(),
      });

      console.log(`Ride ${rideId} accepted by ${acceptedBy}`);
    } catch (error) {
      console.error('Error broadcasting ride accepted:', error);
    }
  });

  /**
   * DISCONNECT - Handle client disconnect
   */
  socket.on('disconnect', () => {
    console.log(`❌ WebSocket client disconnected: ${socket.id} (User: ${userId})`);
  });

  /**
   * ERROR - Handle socket errors
   */
  socket.on('error', (error) => {
    console.error(`WebSocket error for ${socket.id}:`, error);
  });
}

/**
 * Broadcast message to a specific ride room
 * Can be called from REST API handlers
 */
export function broadcastToRide(io: Server, rideId: number, event: string, data: any) {
  const roomName = getRoomName(rideId);
  io.to(roomName).emit(event, data);
  console.log(`Broadcasted ${event} to room ${roomName}`);
}
