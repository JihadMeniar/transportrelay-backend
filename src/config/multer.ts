import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    // Determine destination based on field name
    const uploadPath = file.fieldname === 'documents'
      ? path.join(UPLOAD_PATH, 'documents')
      : path.join(UPLOAD_PATH, 'attachments');
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: uuid + original extension
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter for allowed types
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, PDF, and DOC files are allowed.`));
  }
};

// Configuration for ride documents (max 5 files)
export const uploadDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: parseInt(process.env.MAX_DOCUMENTS_PER_RIDE || '5'),
  },
});

// Configuration for chat attachments (1 file)
export const uploadAttachment = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// Configuration for single document upload
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

export default {
  uploadDocuments,
  uploadAttachment,
  uploadSingle,
};
