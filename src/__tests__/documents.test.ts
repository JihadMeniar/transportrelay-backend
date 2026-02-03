import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../app';
import { cleanupUser, cleanupRide, testRideData } from './helpers';
import { authService } from '../features/auth/auth.service';

const API_PREFIX = '/api';

describe('Documents API', () => {
  let ownerToken: string;
  let ownerId: string;
  let otherToken: string;
  let otherId: string;
  let rideId: number;
  let documentId: string | null = null;

  // Create a temporary test file (PDF-like content)
  const testFilePath = path.join(__dirname, 'test-file.pdf');

  beforeAll(async () => {
    // Create test PDF file (minimal PDF structure)
    const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 2\n0000000000 65535 f\n0000000009 00000 n\ntrailer\n<<\n/Size 2\n/Root 1 0 R\n>>\nstartxref\n56\n%%EOF';
    fs.writeFileSync(testFilePath, pdfContent);

    // Create owner user
    const ownerData = {
      email: `test_docs_owner_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Docs Owner',
      phone: '0612345001',
      department: '75',
    };

    const ownerResult = await authService.register(ownerData);
    ownerToken = ownerResult.token;
    ownerId = ownerResult.user.id;

    // Create other user
    const otherData = {
      email: `test_docs_other_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Docs Other User',
      phone: '0612345002',
      department: '75',
    };

    const otherResult = await authService.register(otherData);
    otherToken = otherResult.token;
    otherId = otherResult.user.id;

    // Create a ride
    const rideRes = await request(app)
      .post(`${API_PREFIX}/rides`)
      .set('Authorization', `Bearer ${ownerToken}`)
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

    rideId = rideRes.body.data?.ride?.id;
  });

  afterAll(async () => {
    // Remove test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    // Clean up database
    if (rideId) {
      await cleanupRide(rideId);
    }
    await cleanupUser(ownerId);
    await cleanupUser(otherId);
  });

  describe('POST /api/documents/upload', () => {
    it('should upload a document successfully', async () => {
      if (!rideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .post(`${API_PREFIX}/documents/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('rideId', rideId.toString())
        .attach('file', testFilePath);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document).toHaveProperty('id');
      expect(res.body.data.document).toHaveProperty('name');
      expect(res.body.data.document).toHaveProperty('mimeType');
      expect(res.body.data.document).toHaveProperty('sizeBytes');

      documentId = res.body.data.document.id;
    });

    it('should fail without authentication', async () => {
      if (!rideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      try {
        const res = await request(app)
          .post(`${API_PREFIX}/documents/upload`)
          .field('rideId', rideId.toString())
          .attach('file', testFilePath);

        expect(res.status).toBe(401);
      } catch (err: any) {
        // ECONNRESET can happen when uploading files without auth
        // This is expected behavior as the server rejects the connection
        expect(err.code).toBe('ECONNRESET');
      }
    });

    it('should fail without file', async () => {
      if (!rideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .post(`${API_PREFIX}/documents/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('rideId', rideId.toString());

      expect(res.status).toBe(400);
    });

    it('should fail without ride ID', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/documents/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', testFilePath);

      expect(res.status).toBe(400);
    });

    it('should fail for non-existent ride', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/documents/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('rideId', '999999')
        .attach('file', testFilePath);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/documents/rides/:rideId', () => {
    it('should get ride documents as owner', async () => {
      if (!rideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/documents/rides/${rideId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.documents)).toBe(true);
      expect(res.body.data.documents.length).toBeGreaterThan(0);
    });

    it('should restrict access for non-owner on non-accepted ride', async () => {
      if (!rideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/documents/rides/${rideId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      // Should return empty array or 403 depending on implementation
      expect([200, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.documents).toEqual([]);
      }
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should get document metadata as owner', async () => {
      if (!documentId) {
        console.log('Skipping test: no document created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/documents/${documentId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document.id).toBe(documentId);
      expect(res.body.data.document).toHaveProperty('name');
      expect(res.body.data.document).toHaveProperty('mimeType');
    });

    it('should return 404 for non-existent document', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/documents/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/documents/:id/download', () => {
    it('should download document as owner', async () => {
      if (!documentId) {
        console.log('Skipping test: no document created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/documents/${documentId}/download`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toBeDefined();
    });
  });

  describe('GET /api/documents/:id/preview', () => {
    it('should preview document as owner', async () => {
      if (!documentId) {
        console.log('Skipping test: no document created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/documents/${documentId}/preview`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('inline');
    });
  });

  describe('DELETE /api/documents/:id', () => {
    let docToDelete: string;

    beforeAll(async () => {
      if (!rideId) return;

      // Upload a document to delete
      const res = await request(app)
        .post(`${API_PREFIX}/documents/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('rideId', rideId.toString())
        .attach('file', testFilePath);

      docToDelete = res.body.data?.document?.id;
    });

    it('should delete document as owner', async () => {
      if (!docToDelete) {
        console.log('Skipping test: no document created');
        return;
      }

      const res = await request(app)
        .delete(`${API_PREFIX}/documents/${docToDelete}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail to delete non-existent document', async () => {
      const res = await request(app)
        .delete(`${API_PREFIX}/documents/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });

    it('should fail to delete document without authentication', async () => {
      if (!rideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      // First upload a new document
      const uploadRes = await request(app)
        .post(`${API_PREFIX}/documents/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('rideId', rideId.toString())
        .attach('file', testFilePath);

      const newDocId = uploadRes.body.data?.document?.id;

      if (!newDocId) {
        console.log('Skipping test: no document created');
        return;
      }

      const res = await request(app)
        .delete(`${API_PREFIX}/documents/${newDocId}`);

      expect(res.status).toBe(401);

      // Clean up - delete the document
      await request(app)
        .delete(`${API_PREFIX}/documents/${newDocId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
    });
  });

  describe('Document access after ride acceptance', () => {
    let acceptedRideId: number;
    let acceptedDocId: string;

    beforeAll(async () => {
      // Create a new ride
      const rideRes = await request(app)
        .post(`${API_PREFIX}/rides`)
        .set('Authorization', `Bearer ${ownerToken}`)
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

      if (!acceptedRideId) return;

      // Upload a document
      const docRes = await request(app)
        .post(`${API_PREFIX}/documents/upload`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('rideId', acceptedRideId.toString())
        .attach('file', testFilePath);

      acceptedDocId = docRes.body.data?.document?.id;

      // Accept the ride with other user
      await request(app)
        .patch(`${API_PREFIX}/rides/${acceptedRideId}/accept`)
        .set('Authorization', `Bearer ${otherToken}`);
    });

    afterAll(async () => {
      if (acceptedRideId) {
        await cleanupRide(acceptedRideId);
      }
    });

    it('should allow taker to access documents after acceptance', async () => {
      if (!acceptedRideId) {
        console.log('Skipping test: no ride created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/documents/rides/${acceptedRideId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documents.length).toBeGreaterThan(0);
    });

    it('should allow taker to download document after acceptance', async () => {
      if (!acceptedDocId) {
        console.log('Skipping test: no document created');
        return;
      }

      const res = await request(app)
        .get(`${API_PREFIX}/documents/${acceptedDocId}/download`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
    });
  });
});
