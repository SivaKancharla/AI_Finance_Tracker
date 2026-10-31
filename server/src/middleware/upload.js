import multer from 'multer';
import env from '../config/env.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: env.IMPORT_MAX_BYTES
  },
  fileFilter: (req, file, cb) => {
    const isCsvMime = [
      'text/csv',
      'application/vnd.ms-excel',
      'text/plain',
      'application/csv'
    ].includes(file.mimetype);

    const isCsvExt = file.originalname && file.originalname.toLowerCase().endsWith('.csv');

    if (isCsvMime || isCsvExt) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files (.csv) are allowed'), false);
    }
  }
});

/**
 * Express middleware wrapper around Multer single file upload.
 * Catches Multer errors (like size limits or invalid extensions) and formats clean HTTP 400 responses.
 */
export const uploadCsv = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File size exceeds maximum allowed limit of ${Math.round(env.IMPORT_MAX_BYTES / 1024)} KB`
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    next();
  });
};

export default uploadCsv;
