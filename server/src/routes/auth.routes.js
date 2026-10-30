import express from 'express';
import {
  signup,
  login,
  getMe,
  updateProfile,
  updatePassword,
  getAuthStats
} from '../controllers/auth.controller.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import asyncHandler from '../middleware/asyncHandler.js';
import {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  updatePasswordSchema
} from '../validations/auth.validation.js';

const router = express.Router();

router.post('/signup', authLimiter, validate(signupSchema), asyncHandler(signup));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login));

// Protected routes
router.get('/me', protect, asyncHandler(getMe));
router.put('/profile', protect, validate(updateProfileSchema), asyncHandler(updateProfile));
router.put('/password', protect, validate(updatePasswordSchema), asyncHandler(updatePassword));
router.get('/stats', protect, asyncHandler(getAuthStats));

export default router;

