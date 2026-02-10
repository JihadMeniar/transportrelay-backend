import { pool } from '../../config/database';
import { Ride, RideDocument, RideFilters, CreateRideDTO } from '../../shared/types';

/**
 * Database row interface for rides
 */
interface RideRow {
  id: number;
  zone: string;
  department: string;
  departure_department: string;
  arrival_department: string;
  departure_city: string | null;
  arrival_city: string | null;
  distance: string;
  exact_distance: string;
  published_at: Date;
  status: string;
  course_type: string;
  medical_type: string | null;
  stretcher_transport: boolean;
  notes: string | null;
  // Scheduling fields
  scheduled_date: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  // Client info
  client_name: string;
  client_phone: string;
  pickup: string;
  destination: string;
  documents_visibility: string;
  published_by: string;
  accepted_by: string | null;
  accepted_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert database row to Ride object
 */
const rowToRide = (row: RideRow): Ride => ({
  id: row.id,
  zone: row.zone,
  department: row.departure_department,
  departureDepartment: row.departure_department,
  arrivalDepartment: row.arrival_department,
  departureCity: row.departure_city || undefined,
  arrivalCity: row.arrival_city || undefined,
  distance: row.distance,
  exactDistance: row.exact_distance,
  publishedAt: row.published_at,
  status: row.status as any,
  courseType: row.course_type as any,
  medicalType: row.medical_type as any,
  stretcherTransport: row.stretcher_transport || false,
  notes: row.notes || undefined,
  // Scheduling
  scheduledDate: row.scheduled_date,
  departureTime: row.departure_time,
  arrivalTime: row.arrival_time,
  // Client info
  clientName: row.client_name,
  clientPhone: row.client_phone,
  pickup: row.pickup,
  destination: row.destination,
  documentsVisibility: row.documents_visibility as any,
  documents: [], // Loaded separately
  publishedBy: row.published_by,
  acceptedBy: row.accepted_by || undefined,
  acceptedAt: row.accepted_at || undefined,
  completedAt: row.completed_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class RidesRepository {
  /**
   * Find all rides with filters
   */
  async findAll(filters: RideFilters): Promise<{ rides: Ride[]; total: number }> {
    const {
      userDepartment,
      status,
      courseType,
      scheduledDate,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (userDepartment) {
      conditions.push(`(departure_department = $${paramIndex} OR arrival_department = $${paramIndex})`);
      params.push(userDepartment);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (courseType) {
      conditions.push(`course_type = $${paramIndex++}`);
      params.push(courseType);
    }

    // Date filters
    if (scheduledDate) {
      conditions.push(`scheduled_date = $${paramIndex++}`);
      params.push(scheduledDate);
    }

    if (fromDate) {
      conditions.push(`scheduled_date >= $${paramIndex++}`);
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push(`scheduled_date <= $${paramIndex++}`);
      params.push(toDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM rides ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated rides - order by scheduled_date and departure_time
    const query = `
      SELECT * FROM rides
      ${whereClause}
      ORDER BY scheduled_date ASC NULLS LAST, departure_time ASC NULLS LAST, published_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const rides = result.rows.map(rowToRide);

    // Load documents for each ride
    await Promise.all(
      rides.map(async (ride) => {
        ride.documents = await this.findDocumentsByRideId(ride.id);
      })
    );

    return { rides, total };
  }

  /**
   * Find ride by ID
   */
  async findById(id: number): Promise<Ride | null> {
    const query = 'SELECT * FROM rides WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const ride = rowToRide(result.rows[0]);
    ride.documents = await this.findDocumentsByRideId(id);

    return ride;
  }

  /**
   * Find rides by user (published or accepted)
   */
  async findByUser(userId: string, filters: RideFilters): Promise<{ rides: Ride[]; total: number }> {
    const {
      status,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = ['(published_by = $1 OR accepted_by = $1)'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM rides ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated rides
    const query = `
      SELECT * FROM rides
      ${whereClause}
      ORDER BY published_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const rides = result.rows.map(rowToRide);

    // Load documents
    await Promise.all(
      rides.map(async (ride) => {
        ride.documents = await this.findDocumentsByRideId(ride.id);
      })
    );

    return { rides, total };
  }

  /**
   * Create a new ride
   */
  async create(data: CreateRideDTO & { publishedBy: string }): Promise<Ride> {
    const query = `
      INSERT INTO rides (
        zone, department, departure_department, arrival_department,
        departure_city, arrival_city,
        distance, exact_distance, course_type, medical_type,
        stretcher_transport, notes,
        scheduled_date, departure_time, arrival_time,
        client_name, client_phone, pickup, destination,
        documents_visibility, published_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const values = [
      data.zone || '',
      data.departureDepartment, // also stored in legacy 'department' column
      data.departureDepartment,
      data.arrivalDepartment,
      data.departureCity || null,
      data.arrivalCity || null,
      data.distance,
      data.distance, // exact_distance = distance initially
      data.courseType,
      data.medicalType,
      data.stretcherTransport || false,
      data.notes || null,
      data.scheduledDate,
      data.departureTime,
      data.arrivalTime,
      data.clientName,
      data.clientPhone,
      data.pickup,
      data.destination,
      'hidden', // documents_visibility
      data.publishedBy,
      'available', // initial status
    ];

    const result = await pool.query(query, values);
    const ride = rowToRide(result.rows[0]);
    ride.documents = [];

    return ride;
  }

  /**
   * Update ride
   */
  async update(id: number, data: Partial<Ride>): Promise<Ride | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (data.acceptedBy !== undefined) {
      fields.push(`accepted_by = $${paramIndex++}`);
      values.push(data.acceptedBy);
    }

    if (data.acceptedAt !== undefined) {
      fields.push(`accepted_at = $${paramIndex++}`);
      values.push(data.acceptedAt);
    }

    if (data.completedAt !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(data.completedAt);
    }

    if (data.documentsVisibility !== undefined) {
      fields.push(`documents_visibility = $${paramIndex++}`);
      values.push(data.documentsVisibility);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE rides
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    const ride = rowToRide(result.rows[0]);
    ride.documents = await this.findDocumentsByRideId(id);

    return ride;
  }

  /**
   * Delete ride
   */
  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM rides WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Find documents by ride ID
   */
  async findDocumentsByRideId(rideId: number): Promise<RideDocument[]> {
    const query = `
      SELECT id, ride_id, name, uri, file_path, mime_type, size_bytes, uploaded_at
      FROM ride_documents
      WHERE ride_id = $1
      ORDER BY uploaded_at ASC
    `;

    const result = await pool.query(query, [rideId]);

    return result.rows.map((row) => ({
      id: row.id,
      rideId: row.ride_id,
      name: row.name,
      uri: row.uri,
      filePath: row.file_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      uploadedAt: row.uploaded_at,
    }));
  }

  /**
   * Add document to ride
   */
  async addDocument(document: Omit<RideDocument, 'id' | 'uploadedAt'>): Promise<RideDocument> {
    const query = `
      INSERT INTO ride_documents (ride_id, name, uri, file_path, mime_type, size_bytes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      document.rideId,
      document.name,
      document.uri,
      document.filePath,
      document.mimeType,
      document.sizeBytes,
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      rideId: row.ride_id,
      name: row.name,
      uri: row.uri,
      filePath: row.file_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      uploadedAt: row.uploaded_at,
    };
  }
}

export const ridesRepository = new RidesRepository();
