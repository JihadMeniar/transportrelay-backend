import { documentsRepository } from './documents.repository';
import { ridesRepository } from '../rides/rides.repository';
import { RideDocument } from '../../shared/types';
import { AppError } from '../../shared/middleware';
import path from 'path';
import fs from 'fs/promises';

export class DocumentsService {
  /**
   * Upload a document to a ride
   */
  async uploadDocument(
    rideId: number,
    userId: string,
    file: any
  ): Promise<RideDocument> {
    // Check if ride exists
    const ride = await ridesRepository.findById(rideId);

    if (!ride) {
      // Clean up uploaded file
      await this.deleteFile(file.path);
      throw new AppError(404, 'Ride not found');
    }

    // Check if user is authorized (publisher or taker)
    if (ride.publishedBy !== userId && ride.acceptedBy !== userId) {
      await this.deleteFile(file.path);
      throw new AppError(403, 'Not authorized to upload documents to this ride');
    }

    // Check document limits
    const documentCount = await documentsRepository.countByRideId(rideId);
    if (documentCount >= 5) {
      await this.deleteFile(file.path);
      throw new AppError(400, 'Maximum 5 documents per ride');
    }

    const totalSize = await documentsRepository.getTotalSizeByRideId(rideId);
    if (totalSize + file.size > 10 * 1024 * 1024) {
      await this.deleteFile(file.path);
      throw new AppError(400, 'Total document size exceeds 10MB');
    }

    // Create document record
    const document = await documentsRepository.create({
      rideId,
      name: file.originalname,
      filePath: file.path,
      uri: `/api/documents/${path.basename(file.path)}`,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });

    return document;
  }

  /**
   * Get document by ID with permission check
   */
  async getDocument(documentId: string, userId?: string): Promise<RideDocument> {
    const document = await documentsRepository.findById(documentId);

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    if (!document.rideId) {
      throw new AppError(500, 'Document has no associated ride');
    }

    // Check permissions
    await this.checkDocumentAccess(document.rideId, userId);

    return document;
  }

  /**
   * Download document
   */
  async downloadDocument(documentId: string, userId?: string): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    const document = await this.getDocument(documentId, userId);

    // Check if file exists
    try {
      await fs.access(document.filePath);
    } catch (error) {
      throw new AppError(404, 'File not found on server');
    }

    return {
      filePath: document.filePath,
      fileName: document.name,
      mimeType: document.mimeType,
    };
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    const document = await documentsRepository.findById(documentId);

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    if (!document.rideId) {
      throw new AppError(500, 'Document has no associated ride');
    }

    // Get ride to check permissions
    const ride = await ridesRepository.findById(document.rideId);

    if (!ride) {
      throw new AppError(404, 'Associated ride not found');
    }

    // Only publisher can delete documents
    if (ride.publishedBy !== userId) {
      throw new AppError(403, 'Only the ride publisher can delete documents');
    }

    // Delete file from filesystem
    await this.deleteFile(document.filePath);

    // Delete from database
    await documentsRepository.delete(documentId);
  }

  /**
   * Get all documents for a ride
   */
  async getRideDocuments(rideId: number, userId?: string): Promise<RideDocument[]> {
    // Check if ride exists
    const ride = await ridesRepository.findById(rideId);

    if (!ride) {
      throw new AppError(404, 'Ride not found');
    }

    // Check permissions
    await this.checkDocumentAccess(rideId, userId);

    return documentsRepository.findByRideId(rideId);
  }

  /**
   * Check if user has access to documents of a ride
   */
  private async checkDocumentAccess(rideId: number, userId?: string): Promise<void> {
    const ride = await ridesRepository.findById(rideId);

    if (!ride) {
      throw new AppError(404, 'Ride not found');
    }

    // Documents are visible only if:
    // 1. User is the publisher
    // 2. User is the taker AND ride is accepted
    // 3. Documents visibility is 'visible'

    const isPublisher = userId && ride.publishedBy === userId;
    const isTaker = userId && ride.acceptedBy === userId;
    const isAccepted = ride.status === 'accepted' || ride.status === 'completed';

    if (!userId || (!isPublisher && !(isTaker && isAccepted))) {
      throw new AppError(403, 'Not authorized to access these documents');
    }

    // Additional check: documents must be visible
    if (ride.documentsVisibility === 'hidden' && !isPublisher) {
      throw new AppError(403, 'Documents are not yet accessible');
    }
  }

  /**
   * Delete file from filesystem
   */
  private async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
      // Don't throw error, just log it
    }
  }
}

export const documentsService = new DocumentsService();
