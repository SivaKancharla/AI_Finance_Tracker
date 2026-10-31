import express from 'express';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction
} from '../controllers/transaction.controller.js';
import {
  previewImport,
  commitImport
} from '../controllers/import.controller.js';
import uploadCsv from '../middleware/upload.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../middleware/asyncHandler.js';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema
} from '../validations/transaction.validation.js';

const router = express.Router();

// All transaction routes are protected
router.use(protect);

// CSV Statement Import routes (mounted before :id)
router.post('/import/preview', uploadCsv, asyncHandler(previewImport));
router.post('/import/commit', asyncHandler(commitImport));

router.post('/', validate(createTransactionSchema), asyncHandler(createTransaction));
router.get('/', validate(transactionQuerySchema, 'query'), asyncHandler(getTransactions));
router.get('/:id', asyncHandler(getTransactionById));
router.put('/:id', validate(updateTransactionSchema), asyncHandler(updateTransaction));
router.delete('/:id', asyncHandler(deleteTransaction));

export default router;

