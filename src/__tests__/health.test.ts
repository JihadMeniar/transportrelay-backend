import request from 'supertest';
import app from '../app';

const API_PREFIX = '/api';

describe('Health Check & Root API', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('environment');
      expect(res.body).toHaveProperty('version');
    });
  });

  describe('GET /api', () => {
    it('should return API info', async () => {
      const res = await request(app).get(API_PREFIX);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('TaxiRelay API v1');
      expect(res.body).toHaveProperty('version');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/non-existent-route');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Route not found');
    });
  });
});
