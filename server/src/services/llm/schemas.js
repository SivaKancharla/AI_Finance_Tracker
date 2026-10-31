import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ALL_CATEGORIES, EXPENSE_CATEGORIES } from '../../constants/categories.js';

// 1. Transaction Categorization Output Schema
export const CategorizeResultSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      category: z.enum(ALL_CATEGORIES),
      merchant: z.string().nullable(),
      confidence: z.number().min(0).max(1)
    })
  )
});

// 2. Budget Optimizer Output Schema (for Phase P5)
export const BudgetOptimizeSchema = z.object({
  suggestedMonthlyBudget: z.number().nonnegative(),
  categoryLimits: z.array(
    z.object({
      category: z.enum(EXPENSE_CATEGORIES),
      limit: z.number().nonnegative(),
      reason: z.string()
    })
  ),
  savingsTips: z.array(z.string())
});

// 3. Financial Insights Output Schema (for Phase P5)
export const InsightsSchema = z.object({
  insights: z.array(
    z.object({
      type: z.enum(['positive', 'warning', 'neutral', 'tip']),
      severity: z.enum(['low', 'medium', 'high']),
      title: z.string(),
      message: z.string(),
      action: z.string().nullable().optional()
    })
  )
});

// Derive JSON Schemas from Zod (Single Source of Truth)
export const CategorizeJsonSchema = zodToJsonSchema(CategorizeResultSchema, 'results', {
  $refStrategy: 'none'
});

export const BudgetOptimizeJsonSchema = zodToJsonSchema(BudgetOptimizeSchema, 'budget', {
  $refStrategy: 'none'
});

export const InsightsJsonSchema = zodToJsonSchema(InsightsSchema, 'insights', {
  $refStrategy: 'none'
});

export default {
  CategorizeResultSchema,
  BudgetOptimizeSchema,
  InsightsSchema,
  CategorizeJsonSchema,
  BudgetOptimizeJsonSchema,
  InsightsJsonSchema
};
