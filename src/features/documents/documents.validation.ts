import { z } from 'zod';

/**
 * Validation schema for uploading a document
 */
export const uploadDocumentSchema = z.object({
  body: z.object({
    rideId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().positive('Invalid ride ID')),
  }),
});

/**
 * Validation schema for getting/downloading a document
 */
export const getDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID format'),
  }),
});

/**
 * Validation schema for deleting a document
 */
export const deleteDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document ID format'),
  }),
});

/**
 * Validation schema for getting all documents of a ride
 */
export const getRideDocumentsSchema = z.object({
  params: z.object({
    rideId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().positive('Invalid ride ID')),
  }),
});
