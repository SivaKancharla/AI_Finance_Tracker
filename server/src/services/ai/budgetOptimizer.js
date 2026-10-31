import { EXPENSE_CATEGORIES } from '../../constants/categories.js';
import { generateStructured } from '../llm/index.js';
import { BudgetOptimizeSchema, BudgetOptimizeJsonSchema } from '../llm/schemas.js';

export const SYSTEM_PROMPT_BUDGET = `You are a careful personal-finance assistant.
Use ONLY the numbers provided. Never invent amounts. Never give investment, tax, or legal advice.
Respond with JSON only, matching the provided schema.`;

/**
 * Deterministically repairs and validates budget suggestions against financial constraints.
 * 
 * Rules:
 * 1. Drop unknown/duplicate categories.
 * 2. Clamp negatives to 0.
 * 3. If sum(limits) > suggestedMonthlyBudget, scale limits down proportionally.
 * 4. If suggestedMonthlyBudget > averageIncome (when income known), cap it at averageIncome.
 * 5. Round to whole rupees.
 * 
 * @param {Object} data 
 * @param {Object} context
 * @param {number} [context.averageIncome]
 * @returns {Object}
 */
export function repairBudgetSuggestions(data, { averageIncome = 0 } = {}) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  let suggestedMonthlyBudget = Math.max(0, Math.round(Number(data.suggestedMonthlyBudget) || 0));

  // If average income is known and positive, cap suggestedMonthlyBudget
  if (averageIncome > 0 && suggestedMonthlyBudget > averageIncome) {
    suggestedMonthlyBudget = Math.round(averageIncome);
  }

  const seenCategories = new Set();
  const validLimits = [];

  const rawLimits = Array.isArray(data.categoryLimits) ? data.categoryLimits : [];
  for (const item of rawLimits) {
    if (!item || !EXPENSE_CATEGORIES.includes(item.category)) continue;
    if (seenCategories.has(item.category)) continue;
    seenCategories.add(item.category);

    const limitVal = Math.max(0, Math.round(Number(item.suggestedLimit ?? item.limit) || 0));
    validLimits.push({
      category: item.category,
      suggestedLimit: limitVal,
      reason: (item.reason || `Budget limit recommendation for ${item.category}`).slice(0, 200)
    });
  }

  // If sum of category limits exceeds monthly budget, scale down proportionally
  const totalCategoryLimits = validLimits.reduce((acc, curr) => acc + curr.suggestedLimit, 0);
  if (suggestedMonthlyBudget > 0 && totalCategoryLimits > suggestedMonthlyBudget) {
    const scale = suggestedMonthlyBudget / totalCategoryLimits;
    for (const lim of validLimits) {
      lim.suggestedLimit = Math.round(lim.suggestedLimit * scale);
    }
  } else if (suggestedMonthlyBudget === 0 && totalCategoryLimits > 0) {
    suggestedMonthlyBudget = totalCategoryLimits;
  }

  const tips = (Array.isArray(data.tips) ? data.tips : [])
    .filter((t) => typeof t === 'string' && t.trim().length > 0)
    .slice(0, 4)
    .map((t) => t.trim().slice(0, 200));

  return {
    suggestedMonthlyBudget,
    categoryLimits: validLimits,
    tips
  };
}

/**
 * Builds deterministic heuristic budget recommendation when no LLM is available.
 * 
 * Rules:
 * - Fixed categories (Rent, Bills, Education, Healthcare) = 100% of average spend.
 * - Flexible categories (Food, Shopping, Entertainment, Transport) = 90% of average spend.
 * - Others = 95% of average spend.
 * - Budget = sum of limits (capped at income if income > 0).
 */
export function buildHeuristicBudget({
  averageIncome = 0,
  averageExpense = 0, // eslint-disable-line no-unused-vars
  categoryAverages = {}
}) {
  const fixedCategories = new Set(['Rent', 'Bills', 'Education', 'Healthcare']);
  const flexibleCategories = new Set(['Food', 'Shopping', 'Entertainment', 'Transport']);

  const categoryLimits = [];
  let sumLimits = 0;

  for (const [category, avgSpend] of Object.entries(categoryAverages)) {
    if (!EXPENSE_CATEGORIES.includes(category) || avgSpend <= 0) continue;

    let limit;
    let reason;
    if (fixedCategories.has(category)) {
      limit = Math.round(avgSpend);
      reason = `Fixed essential expense matched to your ₹${Math.round(avgSpend)} average.`;
    } else if (flexibleCategories.has(category)) {
      limit = Math.round(avgSpend * 0.90);
      reason = `Discretionary spend trimmed by 10% from ₹${Math.round(avgSpend)} average to boost savings.`;
    } else {
      limit = Math.round(avgSpend * 0.95);
      reason = `Moderate 5% optimization target from ₹${Math.round(avgSpend)} average.`;
    }

    categoryLimits.push({
      category,
      suggestedLimit: limit,
      reason
    });
    sumLimits += limit;
  }

  let suggestedMonthlyBudget = sumLimits;
  if (averageIncome > 0 && suggestedMonthlyBudget > averageIncome) {
    suggestedMonthlyBudget = Math.round(averageIncome);
  }

  // Sort descending by limit for prioritized insights
  categoryLimits.sort((a, b) => b.suggestedLimit - a.suggestedLimit);

  const tips = [];
  if (categoryLimits.length > 0) {
    tips.push(`Your highest spending category is ${categoryLimits[0].category}; monitoring this has the largest impact on savings.`);
  }
  if (categoryLimits.length > 1) {
    tips.push(`Look for optimizations in ${categoryLimits[1].category} by reviewing recurring subscriptions or delivery fees.`);
  }
  tips.push('Track mid-month spending against your category targets to avoid end-of-month budget shocks.');
  if (averageIncome > suggestedMonthlyBudget) {
    const savings = Math.round(averageIncome - suggestedMonthlyBudget);
    tips.push(`Adhering to this budget allows monthly savings of approximately ₹${savings}.`);
  }

  return {
    suggestedMonthlyBudget,
    categoryLimits,
    tips: tips.slice(0, 4)
  };
}

/**
 * Generates budget optimization suggestions using LLM with heuristic fallback.
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.averageIncome
 * @param {number} params.averageExpense
 * @param {Object} params.categoryAverages
 * @param {Object|null} params.currentBudget
 * @returns {Promise<{ provider: string, suggestions: Object }>}
 */
export async function optimizeBudget({
  userId,
  averageIncome = 0,
  averageExpense = 0,
  categoryAverages = {},
  currentBudget = null
}) {
  // If there is no spending history at all
  const hasExpenses = Object.values(categoryAverages).some((v) => v > 0) || averageExpense > 0;
  if (!hasExpenses) {
    return {
      provider: 'none',
      suggestions: null,
      reason: 'not_enough_data'
    };
  }

  const promptPayload = {
    facts: {
      averageMonthlyIncome: Math.round(averageIncome),
      averageMonthlyExpense: Math.round(averageExpense),
      categoryMonthlyAverages: Object.fromEntries(
        Object.entries(categoryAverages).map(([k, v]) => [k, Math.round(v)])
      ),
      currentMonthlyBudget: currentBudget?.monthlyBudget || null
    },
    instructions: [
      'Propose a total suggestedMonthlyBudget not exceeding averageMonthlyIncome (if known).',
      'Provide realistic suggestedLimit amounts for expense categories based on the user facts.',
      'Provide a short 1-sentence reason for each category limit.',
      'Provide up to 4 concise, actionable saving tips.'
    ]
  };

  try {
    const res = await generateStructured({
      task: 'budget_optimize',
      system: SYSTEM_PROMPT_BUDGET,
      prompt: `Here are the user financial aggregates:\n${JSON.stringify(promptPayload, null, 2)}\n\nRespond with JSON matching the budget schema.`,
      zodSchema: BudgetOptimizeSchema,
      jsonSchema: BudgetOptimizeJsonSchema,
      userId,
      temperature: 0.1
    });

    const repaired = repairBudgetSuggestions(res.data, { averageIncome });
    if (repaired) {
      return {
        provider: res.provider || 'gemini',
        suggestions: repaired
      };
    }
  } catch (err) { // eslint-disable-line no-unused-vars
    // Fall through to deterministic heuristic fallback
  }

  // Heuristic fallback
  const heuristic = buildHeuristicBudget({
    averageIncome,
    averageExpense,
    categoryAverages
  });

  return {
    provider: 'heuristic',
    suggestions: heuristic
  };
}

export default {
  repairBudgetSuggestions,
  buildHeuristicBudget,
  optimizeBudget
};
