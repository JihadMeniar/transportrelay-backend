import request from 'supertest';
import app from '../app';
import { cleanupUser, cleanupRide, testRideData, testMedicalRideData } from './helpers';
import { authService } from '../features/auth/auth.service';

const API_PREFIX = '/api';

describe('Rides API', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let createdRideId: number | null = null;

  beforeAll(async () => {
    // Create two test users
    const user1Data = {
      email: `test_rides_user1_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Rides Test User 1',
      phone: '0612345001',
      department: '75',
    };

    const user2Data = {
      email: `test_rides_user2_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Rides Test User 2',
      phone: '0612345002',
      department: '75',
    };

    const result1 = await authService.register(user1Data);
    user1Token = result1.token;
    user1Id = result1.user.id;

    const result2 = await authService.register(user2Data);
    user2Token = result2.token;
    user2Id = result2.user.id;
  });

  afterAll(async () => {
    // Clean up created ride
    if (createdRideId) {
      await cleanupRide(createdRideId);
    }
    // Clean up users
    await cleanupUser(user1Id);
    await cleanupUser(user2Id);
  });

  describe('POST /api/rides', () => {
    it('should create a ride successfully', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/rides`)
        .set('Authorization', `Bearer ${user1Token}`)
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

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ride).toHaveProperty('id');
      expect(res.body.data.ride.zone).toBe(testRideData.zone);
      expect(res.body.data.ride.department).toBe(testRideData.department);
      expect(res.body.data.ride.status).toBe('available');

      createdRideId = res.body.data.ride.id;
    });

    it('should create a medical ride successfully', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/rides`)
        .set('Authorization', `Bearer ${user1Token}`)
        .field('zone', testMedicalRideData.zone)
        .field('department', testMedicalRideData.department)
        .field('distance', testMedicalRideData.distance)
        .field('courseType', testMedicalRideData.courseType)
        .field('medicalType', testMedicalRideData.medicalType!)
        .field('scheduledDate', testMedicalRideData.scheduledDate)
        .field('departureTime', testMedicalRideData.departureTime)
        .field('arrivalTime', testMedicalRideData.arrivalTime)
        .field('clientName', testMedicalRideData.clientName)
        .field('clientPhone', testMedicalRideData.clientPhone)
        .field('pickup', testMedicalRideData.pickup)
        .field('destination', testMedicalRideData.destination);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ride.courseType).toBe('medical');
      expect(res.body.data.ride.medicalType).toBe('consultation');

      // Clean up this ride
      await cleanupRide(res.body.data.ride.id);
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/rides`)
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

      expect(res.status).toBe(401);
    });

    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/rides`)
        .set('Authorization', `Bearer ${user1Token}`)
        .field('zone', testRideData.zone);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should fail medical ride without medicalType', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/rides`)
        .set('Authorization', `Bearer ${user1Token}`)
        .field('zone', testRideData.zone)
        .field('department', testRideData.department)
        .field('distance', testRideData.distance)
        .field('courseType', 'medical')
        .field('scheduledDate', testRideData.scheduledDate)
        .field('departureTime', testRideData.departureTime)
        .field('arrivalTime', testRideData.arrivalTime)
        .field('clientName', testRideData.clientName)
        .field('clientPhone', testRideData.clientPhone)
        .field('pickup', testRideData.pickup)
        .field('destination', testRideData.destination);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/rides', () => {
    it('should get all rides', async () => {
      const res = await request(app).get(`${API_PREFIX}/rides`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.rides)).toBe(true);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('limit');
    });

    it('should filter rides by department', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/rides`)
        .query({ department: '75' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      if (res.body.data.rides.length > 0) {
        expect(res.body.data.rides[0].department).toBe('75');
      }
    });

    it('should filter rides by status', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/rides`)
        .query({ status: 'available' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.rides.forEach((ride: any) => {
        expect(ride.status).toBe('available');
      });
    });

    it('should mask sensitive data for unauthenticated users', async () => {
      const res = await request(app).get(`${API_PREFIX}/rides`);

      expect(res.status).toBe(200);
      if (res.body.data.rides.length > 0) {
        const ride = res.body.data.rides.find((r: any) => r.status === 'available');
        if (ride) {
          expect(ride.clientName).toBe('***');
          expect(ride.clientPhone).toBe('***');
        }
      }
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/rides`)
        .query({ page: 1, limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.rides.length).toBeLessThanOrEqual(5);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(5);
    });
  });

  describe('GET /api/rides/:id', () => {
    it('should get ride by id', async () => {
      if (!createdRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/rides/${createdRideId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ride.id).toBe(createdRideId);
    });

    it('should return 404 for non-existent ride', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/rides/999999`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/rides/my-rides', () => {
    it('should get current user rides', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/rides/my-rides`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.rides)).toBe(true);

      // All rides should be published by or accepted by the user
      res.body.data.rides.forEach((ride: any) => {
        expect(
          ride.publishedBy === user1Id || ride.acceptedBy === user1Id
        ).toBe(true);
      });
    });

    it('should fail without authentication', async () => {
      const res = await request(app).get(`${API_PREFIX}/rides/my-rides`);

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/rides/:id/accept', () => {
    it('should fail to accept own ride', async () => {
      if (!createdRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .patch(`${API_PREFIX}/rides/${createdRideId}/accept`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should accept ride successfully by another user', async () => {
      if (!createdRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .patch(`${API_PREFIX}/rides/${createdRideId}/accept`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ride.status).toBe('accepted');
      expect(res.body.data.ride.acceptedBy).toBe(user2Id);
    });

    it('should fail to accept already accepted ride', async () => {
      if (!createdRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .patch(`${API_PREFIX}/rides/${createdRideId}/accept`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/rides/:id/status', () => {
    it('should complete ride successfully', async () => {
      if (!createdRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .patch(`${API_PREFIX}/rides/${createdRideId}/status`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ride.status).toBe('completed');
    });
  });

  describe('DELETE /api/rides/:id', () => {
    let rideToDelete: number;

    beforeAll(async () => {
      // Create a ride to delete
      const res = await request(app)
        .post(`${API_PREFIX}/rides`)
        .set('Authorization', `Bearer ${user1Token}`)
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

      rideToDelete = res.body.data?.ride?.id;
    });

    it('should delete own ride', async () => {
      if (!rideToDelete) {
        console.log('Skipping test: no ride to delete');
        return;
      }

      const res = await request(app)
        .delete(`${API_PREFIX}/rides/${rideToDelete}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail to delete non-existent ride', async () => {
      const res = await request(app)
        .delete(`${API_PREFIX}/rides/999999`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
    });
  });
});
