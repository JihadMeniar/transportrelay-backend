import { pool } from '../config/database';
import { authService } from '../features/auth/auth.service';

// Test user data
export const testUserData = {
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User',
  phone: '0612345678',
  department: '75',
};

export const createTestUser = async (userData = testUserData) => {
  const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;
  const result = await authService.register({
    ...userData,
    email: uniqueEmail,
  });
  return result;
};

export const getAuthToken = async (userData = testUserData) => {
  const result = await createTestUser(userData);
  return { token: result.token, user: result.user };
};

// Test ride data
export const testRideData = {
  zone: 'Paris Centre',
  department: '75',
  distance: '15 km',
  courseType: 'normal' as const,
  medicalType: null,
  scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
  departureTime: '10:00',
  arrivalTime: '11:00',
  clientName: 'Client Test',
  clientPhone: '0698765432',
  pickup: '10 Rue de la Paix, Paris',
  destination: '20 Avenue des Champs-Élysées, Paris',
};

export const testMedicalRideData = {
  ...testRideData,
  courseType: 'medical' as const,
  medicalType: 'consultation' as const,
};

// Create a test ride in the database
export const createTestRide = async (userId: string, rideData = testRideData) => {
  const rideId = await pool.query(
    `INSERT INTO rides (
      zone, department, distance, exact_distance,
      course_type, medical_type,
      scheduled_date, departure_time, arrival_time,
      client_name, client_phone, pickup, destination,
      status, published_by, published_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
    RETURNING id`,
    [
      rideData.zone,
      rideData.department,
      rideData.distance,
      rideData.distance,
      rideData.courseType,
      rideData.medicalType,
      rideData.scheduledDate,
      rideData.departureTime,
      rideData.arrivalTime,
      rideData.clientName,
      rideData.clientPhone,
      rideData.pickup,
      rideData.destination,
      'available',
      userId,
    ]
  );
  return rideId.rows[0].id;
};

// Clean up test data
export const cleanupTestData = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete in correct order to respect foreign key constraints
    await client.query("DELETE FROM message_attachments WHERE message_id IN (SELECT id FROM chat_messages WHERE ride_id IN (SELECT id FROM rides WHERE client_name LIKE 'Client Test%'))");
    await client.query("DELETE FROM chat_messages WHERE ride_id IN (SELECT id FROM rides WHERE client_name LIKE 'Client Test%')");
    await client.query("DELETE FROM ride_documents WHERE ride_id IN (SELECT id FROM rides WHERE client_name LIKE 'Client Test%')");
    await client.query("DELETE FROM rides WHERE client_name LIKE 'Client Test%'");
    await client.query("DELETE FROM users WHERE email LIKE 'test_%@example.com'");

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Clean up a specific user
export const cleanupUser = async (userId: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete related data
    await client.query('DELETE FROM message_attachments WHERE message_id IN (SELECT id FROM chat_messages WHERE sender_id = $1)', [userId]);
    await client.query('DELETE FROM chat_messages WHERE sender_id = $1', [userId]);
    await client.query('DELETE FROM ride_documents WHERE ride_id IN (SELECT id FROM rides WHERE published_by = $1)', [userId]);
    await client.query('DELETE FROM rides WHERE published_by = $1 OR accepted_by = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Clean up a specific ride
export const cleanupRide = async (rideId: number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM message_attachments WHERE message_id IN (SELECT id FROM chat_messages WHERE ride_id = $1)', [rideId]);
    await client.query('DELETE FROM chat_messages WHERE ride_id = $1', [rideId]);
    await client.query('DELETE FROM ride_documents WHERE ride_id = $1', [rideId]);
    await client.query('DELETE FROM rides WHERE id = $1', [rideId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
