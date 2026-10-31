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

// 2. Budget Optimizer Output Schema (Phase P5)
export const BudgetOptimizeSchema = z.object({
  suggestedMonthlyBudget: z.number().min(0),
  categoryLimits: z.array(
    z.object({
      category: z.enum(EXPENSE_CATEGORIES),
      suggestedLimit: z.number().min(0),
      reason: z.string().max(200)
    })
  ),
  tips: z.array(z.string().max(200)).max(4)
});

// 3. Financial Insights Output Schema (Phase P5)
export const InsightsSchema = z.object({
  insights: z.array(
    z.object({
      title: z.string().max(80),
      detail: z.string().max(280),
      severity: z.enum(['info', 'warning', 'critical']),
      category: z.string().nullable().optional()
    })
  ).min(1).max(6)
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
