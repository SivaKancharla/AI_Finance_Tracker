import express from 'express';
import {
  getBudget,
  setBudget,
  updateBudget
} from '../controllers/budget.controller.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { budgetSchema } from '../validations/budget.validation.js';

const router = express.Router();

router.use(protect);

router.get('/', asyncHandler(getBudget));
router.post('/', validate(budgetSchema), asyncHandler(setBudget));
router.put('/', validate(budgetSchema), asyncHandler(updateBudget));

export default router;

