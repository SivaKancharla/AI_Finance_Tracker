import express from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller.js';
import protect from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

router.use(protect);

router.get('/summary', asyncHandler(getDashboardSummary));

export default router;

