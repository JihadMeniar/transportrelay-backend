import request from 'supertest';
import app from '../app';
import { cleanupUser } from './helpers';

const API_PREFIX = '/api';

describe('Auth API', () => {
  let createdUserId: string | null = null;
  let authToken: string | null = null;
  let refreshToken: string | null = null;

  const testUser = {
    email: `test_auth_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test Auth User',
    phone: '0612345678',
    department: '75',
  };

  afterAll(async () => {
    // Clean up created user
    if (createdUserId) {
      await cleanupUser(createdUserId);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.name).toBe(testUser.name);
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.body.data.user).not.toHaveProperty('password_hash');

      createdUserId = res.body.data.user.id;
      authToken = res.body.data.token;
      refreshToken = res.body.data.refreshToken;
    });

    it('should fail to register with duplicate email', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    it('should fail to register with invalid email', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          ...testUser,
          email: 'invalid-email',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should fail to register with weak password', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          ...testUser,
          email: `new_${Date.now()}@example.com`,
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should fail to register with missing fields', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: testUser.email,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe(testUser.email);

      // Update tokens for subsequent tests
      authToken = res.body.data.token;
      refreshToken = res.body.data.refreshToken;
    });

    it('should fail to login with wrong password', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should fail to login with non-existent email', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/auth/me`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.name).toBe(testUser.name);
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should fail without token', async () => {
      const res = await request(app).get(`${API_PREFIX}/auth/me`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/auth/me`)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      if (!refreshToken) {
        console.log('Skipping test: no refresh token');
        return;
      }

      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');

      // Update tokens
      authToken = res.body.data.token;
      if (res.body.data.refreshToken) {
        refreshToken = res.body.data.refreshToken;
      }
    });

    it('should fail with invalid refresh token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh`)
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/change-password', () => {
    const newPassword = 'NewTestPassword456!';

    it('should change password successfully', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/change-password`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should login with new password', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: testUser.email,
          password: newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      authToken = res.body.data.token;
    });

    it('should fail to change password with wrong current password', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/change-password`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'AnotherPassword789!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/logout`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
