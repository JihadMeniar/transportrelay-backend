import { Response } from 'express';
import { ridesService } from './rides.service';
import { usersService } from '../users/users.service';
import { subscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateRideDTO, RideFilters } from '../../shared/types';
import { AuthRequest, asyncHandler } from '../../shared/middleware';

export class RidesController {
  /**
   * GET /api/rides
   * Get all rides with filters (automatically filtered by user's department)
   */
  getRides = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;

    // Récupérer le département de l'utilisateur si connecté et pas de filtre spécifié
    let userDepartment = req.query.department as string;
    if (!userDepartment && userId) {
      const dept = await usersService.getUserDepartment(userId);
      if (dept) {
        userDepartment = dept;
      }
    }

    const filters: RideFilters = {
      userDepartment,
      status: req.query.status as any,
      courseType: req.query.courseType as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };

    const { rides, total } = await ridesService.getRides(filters, userId);

    res.status(200).json({
      success: true,
      data: {
        rides,
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / (filters.limit || 20)),
        hasMore: total > (filters.page || 1) * (filters.limit || 20),
      },
    });
  });

  /**
   * GET /api/rides/:id
   * Get ride by ID
   */
  getRideById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const rideId = parseInt(req.params.id);
    const userId = req.user?.userId;

    const ride = await ridesService.getRideById(rideId, userId);

    res.status(200).json({
      success: true,
      data: { ride },
    });
  });

  /**
   * GET /api/rides/my-rides
   * Get current user's rides (published or accepted)
   */
  getMyRides = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const filters: RideFilters = {
      status: req.query.status as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };

    const { rides, total } = await ridesService.getMyRides(userId, filters);

    res.status(200).json({
      success: true,
      data: {
        rides,
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / (filters.limit || 20)),
        hasMore: total > (filters.page || 1) * (filters.limit || 20),
      },
    });
  });

  /**
   * POST /api/rides
   * Create a new ride with optional documents
   */
  createRide = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const rideData: CreateRideDTO = req.body;
    const files = req.files as any[] | undefined;

    const ride = await ridesService.createRide(userId, rideData, files);

    // Increment ride usage for subscription tracking
    subscriptionsService.incrementUsage(userId, 'published').catch((err) => {
      console.error('[Rides] Error incrementing usage:', err);
    });

    res.status(201).json({
      success: true,
      data: { ride },
      message: 'Ride published successfully',
    });
  });

  /**
   * PATCH /api/rides/:id/accept
   * Accept a ride
   */
  acceptRide = asyncHandler(async (req: AuthRequest, res: Response) => {
    const rideId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const ride = await ridesService.acceptRide(rideId, userId);

    // Increment ride usage for subscription tracking
    subscriptionsService.incrementUsage(userId, 'accepted').catch((err) => {
      console.error('[Rides] Error incrementing usage:', err);
    });

    res.status(200).json({
      success: true,
      data: { ride },
      message: 'Ride accepted successfully',
    });
  });

  /**
   * PATCH /api/rides/:id/status
   * Update ride status (complete or cancel)
   */
  updateRideStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const rideId = parseInt(req.params.id);
    const userId = req.user!.userId;
    const { status } = req.body;

    const ride = await ridesService.updateRideStatus(rideId, userId, status);

    res.status(200).json({
      success: true,
      data: { ride },
      message: `Ride ${status} successfully`,
    });
  });

  /**
   * DELETE /api/rides/:id
   * Delete a ride
   */
  deleteRide = asyncHandler(async (req: AuthRequest, res: Response) => {
    const rideId = parseInt(req.params.id);
    const userId = req.user!.userId;

    await ridesService.deleteRide(rideId, userId);

    res.status(200).json({
      success: true,
      message: 'Ride deleted successfully',
    });
  });
}

export const ridesController = new RidesController();
