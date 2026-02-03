import { pool } from '../../config/database';
import { RideDocument } from '../../shared/types';

/**
 * Database row interface for documents
 */
interface DocumentRow {
  id: string;
  ride_id: number;
  name: string;
  uri: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: Date;
}

/**
 * Convert database row to RideDocument
 */
const rowToDocument = (row: DocumentRow): RideDocument => ({
  id: row.id,
  rideId: row.ride_id,
  name: row.name,
  uri: row.uri,
  filePath: row.file_path,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  uploadedAt: row.uploaded_at,
});

export class DocumentsRepository {
  /**
   * Find document by ID
   */
  async findById(documentId: string): Promise<RideDocument | null> {
    const query = 'SELECT * FROM ride_documents WHERE id = $1';
    const result = await pool.query(query, [documentId]);

    if (result.rows.length === 0) {
      return null;
    }

    return rowToDocument(result.rows[0]);
  }

  /**
   * Find all documents for a ride
   */
  async findByRideId(rideId: number): Promise<RideDocument[]> {
    const query = `
      SELECT * FROM ride_documents
      WHERE ride_id = $1
      ORDER BY uploaded_at ASC
    `;
    const result = await pool.query(query, [rideId]);

    return result.rows.map(rowToDocument);
  }

  /**
   * Create a new document
   */
  async create(document: Omit<RideDocument, 'id' | 'uploadedAt'>): Promise<RideDocument> {
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
    return rowToDocument(result.rows[0]);
  }

  /**
   * Delete a document
   */
  async delete(documentId: string): Promise<boolean> {
    const query = 'DELETE FROM ride_documents WHERE id = $1';
    const result = await pool.query(query, [documentId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get ride ID for a document
   */
  async getRideIdForDocument(documentId: string): Promise<number | null> {
    const query = 'SELECT ride_id FROM ride_documents WHERE id = $1';
    const result = await pool.query(query, [documentId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].ride_id;
  }

  /**
   * Count documents for a ride
   */
  async countByRideId(rideId: number): Promise<number> {
    const query = 'SELECT COUNT(*) FROM ride_documents WHERE ride_id = $1';
    const result = await pool.query(query, [rideId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get total size of documents for a ride
   */
  async getTotalSizeByRideId(rideId: number): Promise<number> {
    const query = 'SELECT COALESCE(SUM(size_bytes), 0) as total FROM ride_documents WHERE ride_id = $1';
    const result = await pool.query(query, [rideId]);
    return parseInt(result.rows[0].total);
  }
}

export const documentsRepository = new DocumentsRepository();
