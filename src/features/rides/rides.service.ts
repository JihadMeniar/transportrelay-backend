import { ridesRepository } from './rides.repository';
import { CreateRideDTO, RideFilters, Ride } from '../../shared/types';
import { AppError } from '../../shared/middleware';
import { sendNewRideNotificationToDepartment } from '../../services/push-notifications.service';
import path from 'path';
import fs from 'fs/promises';

export class RidesService {
  /**
   * Get all rides with filters
   * Masks sensitive data for available rides
   */
  async getRides(filters: RideFilters, userId?: string): Promise<{ rides: Ride[]; total: number }> {
    const { rides, total } = await ridesRepository.findAll(filters);

    // Mask sensitive info for rides not accessible to user
    const sanitizedRides = rides.map((ride) => this.sanitizeRideForUser(ride, userId));

    return { rides: sanitizedRides, total };
  }

  /**
   * Get ride by ID
   */
  async getRideById(rideId: number, userId?: string): Promise<Ride> {
    const ride = await ridesRepository.findById(rideId);

    if (!ride) {
      throw new AppError(404, 'Ride not found');
    }

    return this.sanitizeRideForUser(ride, userId);
  }

  /**
   * Get user's rides (published or accepted)
   */
  async getMyRides(userId: string, filters: RideFilters): Promise<{ rides: Ride[]; total: number }> {
    return ridesRepository.findByUser(userId, filters);
  }

  /**
   * Create a new ride
   */
  async createRide(
    userId: string,
    rideData: CreateRideDTO,
    files?: any[]
  ): Promise<Ride> {
    // Validate total file size
    if (files && files.length > 0) {
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 10 * 1024 * 1024) {
        throw new AppError(400, 'Total file size exceeds 10MB');
      }

      if (files.length > 5) {
        throw new AppError(400, 'Maximum 5 documents allowed');
      }
    }

    // Create ride
    const ride = await ridesRepository.create({
      ...rideData,
      publishedBy: userId,
    });

    // Add documents if provided
    if (files && files.length > 0) {
      const documents = await Promise.all(
        files.map((file) =>
          ridesRepository.addDocument({
            rideId: ride.id,
            name: file.originalname,
            filePath: file.path,
            uri: `/api/documents/${path.basename(file.path)}`,
            mimeType: file.mimetype,
            sizeBytes: file.size,
          })
        )
      );
      ride.documents = documents;
    }

    // Envoyer une notification aux utilisateurs des deux départements
    const departments = new Set([ride.departureDepartment, ride.arrivalDepartment]);
    const notifLabel = ride.departureCity && ride.arrivalCity
      ? `${ride.departureCity} → ${ride.arrivalCity}`
      : ride.zone || `${ride.departureDepartment} → ${ride.arrivalDepartment}`;
    for (const dept of departments) {
      if (dept) {
        sendNewRideNotificationToDepartment(
          dept,
          userId,
          ride.id,
          notifLabel,
          ride.distance
        ).catch((err) => {
          console.error('[Rides] Error sending department notification:', err);
        });
      }
    }

    return ride;
  }

  /**
   * Accept a ride
   */
  async acceptRide(rideId: number, userId: string): Promise<Ride> {
    const ride = await ridesRepository.findById(rideId);

    if (!ride) {
      throw new AppError(404, 'Ride not found');
    }

    if (ride.status !== 'available') {
      throw new AppError(400, 'Ride is not available');
    }

    if (ride.publishedBy === userId) {
      throw new AppError(400, 'Cannot accept your own ride');
    }

    const updatedRide = await ridesRepository.update(rideId, {
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt: new Date(),
      documentsVisibility: 'visible',
    });

    if (!updatedRide) {
      throw new AppError(500, 'Failed to update ride');
    }

    return updatedRide;
  }

  /**
   * Update ride status
   */
  async updateRideStatus(
    rideId: number,
    userId: string,
    status: 'completed' | 'cancelled'
  ): Promise<Ride> {
    const ride = await ridesRepository.findById(rideId);

    if (!ride) {
      throw new AppError(404, 'Ride not found');
    }

    // Check permissions
    if (ride.publishedBy !== userId && ride.acceptedBy !== userId) {
      throw new AppError(403, 'Not authorized to update this ride');
    }

    const updates: Partial<Ride> = { status };

    if (status === 'completed') {
      updates.completedAt = new Date();
    }

    const updatedRide = await ridesRepository.update(rideId, updates);

    if (!updatedRide) {
      throw new AppError(500, 'Failed to update ride');
    }

    return updatedRide;
  }

  /**
   * Delete ride
   */
  async deleteRide(rideId: number, userId: string): Promise<void> {
    const ride = await ridesRepository.findById(rideId);

    if (!ride) {
      throw new AppError(404, 'Ride not found');
    }

    if (ride.publishedBy !== userId) {
      throw new AppError(403, 'Not authorized to delete this ride');
    }

    if (ride.status === 'accepted' || ride.status === 'completed') {
      throw new AppError(400, 'Cannot delete accepted or completed rides');
    }

    // Delete associated document files
    if (ride.documents.length > 0) {
      await Promise.all(
        ride.documents.map(async (doc) => {
          try {
            await fs.unlink(doc.filePath);
          } catch (error) {
            console.error(`Failed to delete file ${doc.filePath}:`, error);
          }
        })
      );
    }

    const deleted = await ridesRepository.delete(rideId);

    if (!deleted) {
      throw new AppError(500, 'Failed to delete ride');
    }
  }

  /**
   * Sanitize ride data based on user access
   * Masks sensitive client info for rides not yet accepted
   */
  private sanitizeRideForUser(ride: Ride, userId?: string): Ride {
    // User can see full data if:
    // 1. They published the ride
    // 2. They accepted the ride
    // 3. Ride is not in 'available' status
    const canViewFullData =
      userId &&
      (ride.publishedBy === userId ||
        ride.acceptedBy === userId ||
        ride.status !== 'available');

    if (canViewFullData) {
      return ride;
    }

    // Mask sensitive data for available rides
    return {
      ...ride,
      clientName: '***',
      clientPhone: '***',
      pickup: this.maskAddress(ride.pickup),
      destination: this.maskAddress(ride.destination),
      // Hide documents for non-accepted rides
      documents: ride.documentsVisibility === 'visible' ? ride.documents : [],
    };
  }

  /**
   * Mask address - show only first word
   */
  private maskAddress(address: string): string {
    const words = address.split(' ');
    if (words.length <= 1) {
      return '***';
    }
    return `${words[0]} ***`;
  }
}

export const ridesService = new RidesService();
