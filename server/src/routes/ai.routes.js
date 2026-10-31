import express from 'express';
import { predictSpending } from '../controllers/ai.controller.js';
import protect from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

router.use(protect);

router.post('/predict', asyncHandler(predictSpending));

export default router;

