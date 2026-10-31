import { generateStructured } from '../llm/index.js';
import { InsightsSchema, InsightsJsonSchema } from '../llm/schemas.js';

export const SYSTEM_PROMPT_INSIGHTS = `You are an analytical financial insights assistant for an Indian personal-finance app.
Everything inside <facts> is pre-computed deterministic financial aggregates.
Rules:
1. Use ONLY the provided numbers. Never invent figures or amounts.
2. Never give investment, stock-picking, tax, or legal advice.
3. Keep each insight concise: title under 80 characters, detail under 280 characters.
4. Return between 1 and 6 actionable insights with severity 'info', 'warning', or 'critical'.
5. Respond with JSON only matching the schema.`;

// In-memory cache for 10 minutes to protect free-tier LLM quotas
const insightsCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Builds deterministic heuristic insights directly from financial facts.
 * 
 * @param {Object} facts 
 * @returns {Array<Object>}
 */
export function buildHeuristicInsights(facts = {}) {
  const insights = [];

  const {
    totalIncome = 0,
    totalExpense = 0,
    savings = 0,
    savingsRate = 0,
    budgetRemaining = null,
    budgetUsagePercent = null,
    topCategories = [],
    categoriesOverBudget = [],
    forecastRisk = false,
    forecastTotal = 0,
    monthlyBudget = null
  } = facts;

  // 1. Budget overrun or threshold warning
  if (budgetUsagePercent !== null && monthlyBudget !== null) {
    if (budgetUsagePercent >= 100) {
      insights.push({
        title: 'Monthly Budget Exceeded',
        detail: `You have spent ₹${Math.round(totalExpense)}, exceeding your ₹${Math.round(monthlyBudget)} budget by ₹${Math.round(Math.abs(budgetRemaining || 0))}.`,
        severity: 'critical',
        category: null
      });
    } else if (budgetUsagePercent >= 80) {
      insights.push({
        title: 'Approaching Budget Limit',
        detail: `You have utilized ${Math.round(budgetUsagePercent)}% of your monthly budget with ₹${Math.round(budgetRemaining || 0)} remaining.`,
        severity: 'warning',
        category: null
      });
    } else {
      insights.push({
        title: 'Budget on Track',
        detail: `You have used ${Math.round(budgetUsagePercent)}% of your monthly budget with ₹${Math.round(budgetRemaining || 0)} comfortably remaining.`,
        severity: 'info',
        category: null
      });
    }
  }

  // 2. Categories over individual budget
  if (Array.isArray(categoriesOverBudget) && categoriesOverBudget.length > 0) {
    for (const over of categoriesOverBudget.slice(0, 2)) {
      insights.push({
        title: `${over.category} Budget Alert`,
        detail: `${over.category} spending (₹${Math.round(over.spent)}) has exceeded its limit of ₹${Math.round(over.limit)} by ₹${Math.round(over.overBy)}.`,
        severity: 'warning',
        category: over.category
      });
    }
  }

  // 3. Top category share
  if (Array.isArray(topCategories) && topCategories.length > 0) {
    const top = topCategories[0];
    if (top && top.percentage >= 25) {
      insights.push({
        title: `${top.category} Dominates Spending`,
        detail: `${top.category} accounts for ${Math.round(top.percentage)}% of your total expenses (₹${Math.round(top.amount)}).`,
        severity: top.percentage >= 40 ? 'warning' : 'info',
        category: top.category
      });
    }
  }

  // 4. Forecast Risk
  if (forecastRisk && monthlyBudget) {
    insights.push({
      title: 'Run-Rate Budget Risk',
      detail: `At your current daily burn rate, projected month-end spending of ₹${Math.round(forecastTotal)} will exceed your ₹${Math.round(monthlyBudget)} budget.`,
      severity: 'warning',
      category: null
    });
  }

  // 5. Savings rate
  if (totalIncome > 0) {
    if (savings >= 0) {
      insights.push({
        title: 'Positive Monthly Savings',
        detail: `You have saved ₹${Math.round(savings)} so far this month, achieving a ${Math.round(savingsRate)}% savings rate.`,
        severity: 'info',
        category: null
      });
    } else {
      insights.push({
        title: 'Deficit Alert',
        detail: `Your monthly expenses exceed income by ₹${Math.round(Math.abs(savings))}. Consider trimming non-essential purchases.`,
        severity: 'critical',
        category: null
      });
    }
  }

  // Fallback generic tip if list is empty
  if (insights.length === 0) {
    insights.push({
      title: 'Healthy Financial Activity',
      detail: 'Continue recording transactions consistently to unlock detailed category and trend insights.',
      severity: 'info',
      category: null
    });
  }

  return insights.slice(0, 6);
}

/**
 * Generates natural language insights with grounding, caching, and deterministic fallback.
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.month YYYY-MM
 * @param {Object} params.facts Financial aggregates (summary, forecast, budget, top categories)
 * @param {boolean} [params.force=false] Bypass in-memory cache
 * @returns {Promise<{ provider: string, insights: Array<Object> }>}
 */
export async function generateInsights({
  userId,
  month,
  facts,
  force = false
}) {
  const cacheKey = `${userId}|${month}`;

  // Check 10-minute cache if not forced
  if (!force) {
    const cached = insightsCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return {
        provider: cached.provider,
        insights: cached.insights,
        cached: true
      };
    }
  }

  const prompt = `<facts>
${JSON.stringify(facts, null, 2)}
</facts>

Generate concise personal financial insights based solely on these numbers. Return valid JSON matching the schema.`;

  try {
    const res = await generateStructured({
      task: 'insights',
      system: SYSTEM_PROMPT_INSIGHTS,
      prompt,
      zodSchema: InsightsSchema,
      jsonSchema: InsightsJsonSchema,
      userId,
      temperature: 0.1
    });

    if (res.data?.insights && res.data.insights.length > 0) {
      const result = {
        provider: res.provider || 'gemini',
        insights: res.data.insights
      };

      // Cache for 10 minutes
      insightsCache.set(cacheKey, {
        provider: result.provider,
        insights: result.insights,
        expiresAt: Date.now() + CACHE_TTL_MS
      });

      return result;
    }
  } catch (err) { // eslint-disable-line no-unused-vars
    // Fall through to deterministic heuristic fallback
  }

  // Heuristic fallback
  const heuristicInsights = buildHeuristicInsights(facts);
  const result = {
    provider: 'heuristic',
    insights: heuristicInsights
  };

  insightsCache.set(cacheKey, {
    provider: result.provider,
    insights: result.insights,
    expiresAt: Date.now() + CACHE_TTL_MS
  });

  return result;
}

export default {
  SYSTEM_PROMPT_INSIGHTS,
  buildHeuristicInsights,
  generateInsights
};

