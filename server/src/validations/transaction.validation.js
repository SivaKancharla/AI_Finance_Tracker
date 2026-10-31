import { z } from 'zod';
import { ALL_CATEGORIES, PAYMENT_METHODS } from '../constants/categories.js';

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    required_error: 'Transaction type is required'
  }),
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().default(''),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  category: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().default('upi'),
  transactionDate: z.string().or(z.date()).optional()
});

export const updateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(500).optional(),
  amount: z.coerce.number().positive().optional(),
  category: z.enum(ALL_CATEGORIES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  transactionDate: z.string().or(z.date()).optional(),
  needsReview: z.boolean().optional()
});

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z
    .enum([
      'latest',
      'oldest',
      'amount_desc',
      'amount_asc',
      '-transactionDate',
      'transactionDate',
      '-amount',
      'amount'
    ])
    .default('latest')
});

