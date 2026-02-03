import { Router } from 'express';
import { documentsController } from './documents.controller';
import { authenticate, optionalAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { uploadLimiter } from '../../shared/middleware/rateLimiter.middleware';
import { uploadSingle } from '../../config/multer';
import {
  uploadDocumentSchema,
  getDocumentSchema,
  deleteDocumentSchema,
  getRideDocumentsSchema,
} from './documents.validation';

const router = Router();

/**
 * POST /api/documents/upload
 * Upload a document to a ride
 * Requires authentication
 */
router.post(
  '/upload',
  authenticate,
  uploadLimiter,
  uploadSingle.single('file'),
  validate(uploadDocumentSchema),
  documentsController.uploadDocument
);

/**
 * GET /api/documents/rides/:rideId
 * Get all documents for a ride
 * Authentication optional (checks permissions)
 */
router.get(
  '/rides/:rideId',
  optionalAuth,
  validate(getRideDocumentsSchema),
  documentsController.getRideDocuments
);

/**
 * GET /api/documents/:id
 * Get document metadata
 * Authentication optional (checks permissions)
 */
router.get(
  '/:id',
  optionalAuth,
  validate(getDocumentSchema),
  documentsController.getDocument
);

/**
 * GET /api/documents/:id/download
 * Download a document
 * Authentication optional (checks permissions)
 */
router.get(
  '/:id/download',
  optionalAuth,
  validate(getDocumentSchema),
  documentsController.downloadDocument
);

/**
 * GET /api/documents/:id/preview
 * Preview a document (inline)
 * Authentication optional (checks permissions)
 */
router.get(
  '/:id/preview',
  optionalAuth,
  validate(getDocumentSchema),
  documentsController.previewDocument
);

/**
 * DELETE /api/documents/:id
 * Delete a document
 * Requires authentication
 */
router.delete(
  '/:id',
  authenticate,
  validate(deleteDocumentSchema),
  documentsController.deleteDocument
);

export default router;
