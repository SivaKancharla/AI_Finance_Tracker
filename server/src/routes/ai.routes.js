import express from 'express';
import {
  predictSpending,
  categorizeTransaction,
  getAiStats
} from '../controllers/ai.controller.js';
import protect from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { aiLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.use(protect);

router.post('/predict', asyncHandler(predictSpending));
router.post('/categorize', aiLimiter, asyncHandler(categorizeTransaction));
router.get('/stats', asyncHandler(getAiStats));

export default router;
