import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../constants/categories.js';

export const categoryBudgetSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, {
    required_error: 'Category is required'
  }),
  limit: z.coerce.number().min(0, 'Limit must be 0 or greater')
});

export const budgetSchema = z.object({
  monthlyBudget: z.coerce.number().min(0, 'Monthly budget must be 0 or greater'),
  categoryBudgets: z.array(categoryBudgetSchema).default([])
}).refine(
  (data) => {
    const categories = data.categoryBudgets.map((item) => item.category);
    return new Set(categories).size === categories.length;
  },
  {
    message: 'Duplicate categories are not allowed in categoryBudgets',
    path: ['categoryBudgets']
  }
);

