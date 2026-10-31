import express from 'express';
import { getMonthlyReport } from '../controllers/report.controller.js';
import protect from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

router.use(protect);

router.get('/monthly', asyncHandler(getMonthlyReport));

export default router;

