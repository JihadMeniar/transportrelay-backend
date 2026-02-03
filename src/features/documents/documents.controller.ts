import { Response } from 'express';
import path from 'path';
import { documentsService } from './documents.service';
import { AuthRequest, asyncHandler } from '../../shared/middleware';
import { AppError } from '../../shared/middleware';

export class DocumentsController {
  /**
   * POST /api/documents/upload
   * Upload a document to a ride
   */
  uploadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const rideId = parseInt(req.body.rideId);
    const file = req.file;

    if (!file) {
      throw new AppError(400, 'No file uploaded');
    }

    const document = await documentsService.uploadDocument(rideId, userId, file);

    res.status(201).json({
      success: true,
      data: { document },
      message: 'Document uploaded successfully',
    });
  });

  /**
   * GET /api/documents/:id/download
   * Download a document
   */
  downloadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
    const documentId = req.params.id;
    const userId = req.user?.userId;

    const { filePath, fileName, mimeType } = await documentsService.downloadDocument(documentId, userId);
    const absolutePath = path.resolve(filePath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(absolutePath);
  });

  /**
   * GET /api/documents/:id/preview
   * Preview a document (inline display)
   */
  previewDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
    const documentId = req.params.id;
    const userId = req.user?.userId;

    const { filePath, fileName, mimeType } = await documentsService.downloadDocument(documentId, userId);
    const absolutePath = path.resolve(filePath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(absolutePath);
  });

  /**
   * GET /api/documents/:id
   * Get document metadata
   */
  getDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
    const documentId = req.params.id;
    const userId = req.user?.userId;

    const document = await documentsService.getDocument(documentId, userId);

    res.status(200).json({
      success: true,
      data: { document },
    });
  });

  /**
   * DELETE /api/documents/:id
   * Delete a document
   */
  deleteDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
    const documentId = req.params.id;
    const userId = req.user!.userId;

    await documentsService.deleteDocument(documentId, userId);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  });

  /**
   * GET /api/documents/rides/:rideId
   * Get all documents for a ride
   */
  getRideDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const rideId = parseInt(req.params.rideId);
    const userId = req.user?.userId;

    const documents = await documentsService.getRideDocuments(rideId, userId);

    res.status(200).json({
      success: true,
      data: {
        documents,
        total: documents.length,
      },
    });
  });
}

export const documentsController = new DocumentsController();
