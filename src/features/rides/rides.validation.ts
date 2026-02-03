import { z } from 'zod';

// Date regex: YYYY-MM-DD
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
// Time regex: HH:MM (24h format)
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Validation schema for creating a ride
 */
export const createRideSchema = z.object({
  body: z
    .object({
      zone: z.string().min(1, 'Zone is required').max(255),
      department: z
        .string()
        .regex(/^[0-9]{2,3}$/, 'Invalid department code (e.g., 75, 92, 971)'),
      distance: z.string().min(1, 'Distance is required').max(50),
      courseType: z.enum(['normal', 'medical'], {
        errorMap: () => ({ message: 'Course type must be "normal" or "medical"' }),
      }),
      medicalType: z.enum(['hospitalisation', 'consultation']).optional().nullable(),
      // Scheduling fields (required)
      scheduledDate: z
        .string()
        .regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
      departureTime: z
        .string()
        .regex(timeRegex, 'Departure time must be in HH:MM format'),
      arrivalTime: z
        .string()
        .regex(timeRegex, 'Arrival time must be in HH:MM format'),
      // Client info
      clientName: z.string().min(1, 'Client name is required').max(255),
      clientPhone: z.string().min(1, 'Client phone is required').max(20),
      pickup: z.string().min(1, 'Pickup address is required').max(500),
      destination: z.string().min(1, 'Destination is required').max(500),
    })
    .refine(
      (data) => {
        // If courseType is medical, medicalType must be provided
        if (data.courseType === 'medical') {
          return data.medicalType !== null && data.medicalType !== undefined;
        }
        return true;
      },
      {
        message: 'Medical type is required for medical courses',
        path: ['medicalType'],
      }
    ),
    // Note: On ne valide pas que arrivalTime > departureTime car
    // une course peut traverser minuit (ex: départ 23h, arrivée 1h)
});

/**
 * Validation schema for getting rides with filters
 */
export const getRidesSchema = z.object({
  query: z.object({
    department: z.string().optional(),
    status: z
      .enum(['available', 'accepted', 'published', 'completed', 'cancelled'])
      .optional(),
    courseType: z.enum(['normal', 'medical']).optional(),
    // Date filters
    scheduledDate: z.string().regex(dateRegex).optional(),
    fromDate: z.string().regex(dateRegex).optional(),
    toDate: z.string().regex(dateRegex).optional(),
    // Pagination
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().min(1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().min(1).max(100)),
  }),
});

/**
 * Validation schema for getting a single ride
 */
export const getRideByIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().positive()),
  }),
});

/**
 * Validation schema for updating ride status
 */
export const updateRideStatusSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().positive()),
  }),
  body: z.object({
    status: z.enum(['completed', 'cancelled'], {
      errorMap: () => ({ message: 'Status must be "completed" or "cancelled"' }),
    }),
  }),
});

/**
 * Validation schema for accepting a ride
 */
export const acceptRideSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().positive()),
  }),
});

/**
 * Validation schema for deleting a ride
 */
export const deleteRideSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().positive()),
  }),
});
