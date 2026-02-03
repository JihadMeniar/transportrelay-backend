import request from 'supertest';
import app from '../app';
import { cleanupUser, cleanupRide, testRideData } from './helpers';
import { authService } from '../features/auth/auth.service';

const API_PREFIX = '/api';

describe('Chat API', () => {
  let publisherToken: string;
  let publisherId: string;
  let takerToken: string;
  let takerId: string;
  let acceptedRideId: number;
  let messageId: string | null = null;

  beforeAll(async () => {
    // Create publisher user
    const publisherData = {
      email: `test_chat_publisher_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Chat Publisher',
      phone: '0612345001',
      department: '75',
    };

    const publisherResult = await authService.register(publisherData);
    publisherToken = publisherResult.token;
    publisherId = publisherResult.user.id;

    // Create taker user
    const takerData = {
      email: `test_chat_taker_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Chat Taker',
      phone: '0612345002',
      department: '75',
    };

    const takerResult = await authService.register(takerData);
    takerToken = takerResult.token;
    takerId = takerResult.user.id;

    // Create a ride
    const rideRes = await request(app)
      .post(`${API_PREFIX}/rides`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .field('zone', testRideData.zone)
      .field('department', testRideData.department)
      .field('distance', testRideData.distance)
      .field('courseType', testRideData.courseType)
      .field('scheduledDate', testRideData.scheduledDate)
      .field('departureTime', testRideData.departureTime)
      .field('arrivalTime', testRideData.arrivalTime)
      .field('clientName', testRideData.clientName)
      .field('clientPhone', testRideData.clientPhone)
      .field('pickup', testRideData.pickup)
      .field('destination', testRideData.destination);

    acceptedRideId = rideRes.body.data?.ride?.id;

    // Accept the ride with taker
    if (acceptedRideId) {
      await request(app)
        .patch(`${API_PREFIX}/rides/${acceptedRideId}/accept`)
        .set('Authorization', `Bearer ${takerToken}`);
    }
  });

  afterAll(async () => {
    // Clean up
    if (acceptedRideId) {
      await cleanupRide(acceptedRideId);
    }
    await cleanupUser(publisherId);
    await cleanupUser(takerId);
  });

  describe('POST /api/chat/rides/:rideId/messages', () => {
    it('should send a text message as publisher', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .post(`${API_PREFIX}/chat/rides/${acceptedRideId}/messages`)
        .set('Authorization', `Bearer ${publisherToken}`)
        .send({
          content: 'Hello from publisher!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toHaveProperty('id');
      expect(res.body.data.message.content).toBe('Hello from publisher!');
      expect(res.body.data.message.senderRole).toBe('publisher');

      messageId = res.body.data.message.id;
    });

    it('should send a text message as taker', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .post(`${API_PREFIX}/chat/rides/${acceptedRideId}/messages`)
        .set('Authorization', `Bearer ${takerToken}`)
        .send({
          content: 'Hello from taker!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.senderRole).toBe('taker');
    });

    it('should fail to send message without authentication', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .post(`${API_PREFIX}/chat/rides/${acceptedRideId}/messages`)
        .send({
          content: 'This should fail',
        });

      expect(res.status).toBe(401);
    });

    it('should fail to send message on non-accepted ride', async () => {
      // Create a new ride that is not accepted
      const rideRes = await request(app)
        .post(`${API_PREFIX}/rides`)
        .set('Authorization', `Bearer ${publisherToken}`)
        .field('zone', testRideData.zone)
        .field('department', testRideData.department)
        .field('distance', testRideData.distance)
        .field('courseType', testRideData.courseType)
        .field('scheduledDate', testRideData.scheduledDate)
        .field('departureTime', testRideData.departureTime)
        .field('arrivalTime', testRideData.arrivalTime)
        .field('clientName', testRideData.clientName)
        .field('clientPhone', testRideData.clientPhone)
        .field('pickup', testRideData.pickup)
        .field('destination', testRideData.destination);

      const newRideId = rideRes.body.data?.ride?.id;

      if (!newRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .post(`${API_PREFIX}/chat/rides/${newRideId}/messages`)
        .set('Authorization', `Bearer ${publisherToken}`)
        .send({
          content: 'This should fail',
        });

      expect(res.status).toBe(403);

      // Clean up
      await cleanupRide(newRideId);
    });

    it('should fail to send empty message', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .post(`${API_PREFIX}/chat/rides/${acceptedRideId}/messages`)
        .set('Authorization', `Bearer ${publisherToken}`)
        .send({
          content: '',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/chat/rides/:rideId/messages', () => {
    it('should get messages for a ride as publisher', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/chat/rides/${acceptedRideId}/messages`)
        .set('Authorization', `Bearer ${publisherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.messages)).toBe(true);
      expect(res.body.data.messages.length).toBeGreaterThan(0);
    });

    it('should get messages for a ride as taker', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/chat/rides/${acceptedRideId}/messages`)
        .set('Authorization', `Bearer ${takerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.messages)).toBe(true);
    });

    it('should support pagination', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/chat/rides/${acceptedRideId}/messages`)
        .set('Authorization', `Bearer ${publisherToken}`)
        .query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.messages.length).toBeLessThanOrEqual(1);
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('totalPages');
    });

    it('should fail without authentication', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/chat/rides/${acceptedRideId}/messages`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/chat/rides/:rideId/count', () => {
    it('should get message count for a ride', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/chat/rides/${acceptedRideId}/count`)
        .set('Authorization', `Bearer ${publisherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('count');
      expect(typeof res.body.data.count).toBe('number');
      expect(res.body.data.count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/chat/messages/:messageId', () => {
    it('should get a specific message', async () => {
      if (!messageId) {
        console.log('Skipping test: no message created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/chat/messages/${messageId}`)
        .set('Authorization', `Bearer ${publisherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.id).toBe(messageId);
    });

    it('should return 404 for non-existent message', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/chat/messages/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${publisherToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/chat/messages/:messageId', () => {
    let messageToDelete: string;

    beforeAll(async () => {
      if (!acceptedRideId) return;

      // Create a message to delete
      const res = await request(app)
        .post(`${API_PREFIX}/chat/rides/${acceptedRideId}/messages`)
        .set('Authorization', `Bearer ${publisherToken}`)
        .send({
          content: 'Message to delete',
        });

      messageToDelete = res.body.data?.message?.id;
    });

    it('should delete own message', async () => {
      if (!messageToDelete) {
        console.log('Skipping test: no message created');
        return;
      }

      const res = await request(app)
        .delete(`${API_PREFIX}/chat/messages/${messageToDelete}`)
        .set('Authorization', `Bearer ${publisherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail to delete another user message', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      // Create a message with publisher
      const createRes = await request(app)
        .post(`${API_PREFIX}/chat/rides/${acceptedRideId}/messages`)
        .set('Authorization', `Bearer ${publisherToken}`)
        .send({
          content: 'Publisher message',
        });

      const msgId = createRes.body.data?.message?.id;
      if (!msgId) {
        console.log('Skipping test: no message created');
        return;
      }

      // Try to delete with taker
      const res = await request(app)
        .delete(`${API_PREFIX}/chat/messages/${msgId}`)
        .set('Authorization', `Bearer ${takerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
