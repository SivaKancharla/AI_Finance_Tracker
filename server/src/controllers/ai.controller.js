import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import AiCallLog from '../models/AiCallLog.js';
import CategoryMemory from '../models/CategoryMemory.js';
import {
  currentMonthKey,
  parseMonthParam,
  getMonthRange,
  lastNMonthKeys
} from '../services/analytics/dateRange.js';
import { forecast } from '../services/analytics/forecast.js';
import { categorizeSingle } from '../services/categorization/pipeline.js';
import { round2, summarizeMonth } from '../services/analytics/summary.js';
import { optimizeBudget } from '../services/ai/budgetOptimizer.js';
import { generateInsights } from '../services/ai/insights.js';

/**
 * Calculates the p-th percentile of an array of numbers.
 * @param {number[]} numbers 
 * @param {number} p Value between 0 and 1 (e.g. 0.95 for p95)
 * @returns {number}
 */
export function calculatePercentile(numbers = [], p = 0.95) {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil(p * sorted.length) - 1;
  const clampedIndex = Math.max(0, Math.min(index, sorted.length - 1));
  return round2(sorted[clampedIndex]);
}

/**
 * Categorize a single transaction live for form suggestions.
 * POST /api/ai/categorize
 */
export const categorizeTransaction = async (req, res) => {
  const { title, description = '', amount, type = 'expense' } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Title is required for categorization'
    });
  }

  const result = await categorizeSingle(req.userId, {
    title,
    description,
    amount: Number(amount) || 0,
    type
  });

  res.status(200).json({
    success: true,
    data: {
      category: result.category,
      confidence: result.confidence,
      merchant: result.merchant,
      source: result.source,
      needsReview: result.needsReview
    }
  });
};

/**
 * Spending prediction endpoint.
 * POST /api/ai/predict
 */
export const predictSpending = async (req, res) => {
  const currentKey = currentMonthKey();
  const prior4Keys = lastNMonthKeys(4, currentKey);
  const oldestMonth = parseMonthParam(prior4Keys[0]);

  const windowStart = getMonthRange(oldestMonth.year, oldestMonth.month).start;

  const [transactions, budget] = await Promise.all([
    Transaction.find({
      userId: req.userId,
      transactionDate: { $gte: windowStart }
    })
      .sort({ transactionDate: -1 })
      .lean(),
    Budget.findOne({ userId: req.userId }).lean()
  ]);

  const forecastResult = forecast({
    transactions,
    budget,
    now: new Date()
  });

  res.status(200).json({
    success: true,
    data: forecastResult
  });
};

/**
 * AI Observability Statistics endpoint.
 * GET /api/ai/stats
 */
export const getAiStats = async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [aiLogs, sourceCounts, memoryEntries] = await Promise.all([
    AiCallLog.find({
      userId: req.userId,
      createdAt: { $gte: thirtyDaysAgo }
    }).lean(),

    Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$categorySource',
          count: { $sum: 1 }
        }
      }
    ]),

    CategoryMemory.countDocuments({ userId: req.userId })
  ]);

  const totalCalls = aiLogs.length;
  const successfulCalls = aiLogs.filter((l) => l.ok).length;
  const successRate = totalCalls > 0 ? round2((successfulCalls / totalCalls) * 100) : 100;

  const fallbackTasks = aiLogs.filter((l) => l.fallbackUsed).length;
  const fallbackRate = totalCalls > 0 ? round2((fallbackTasks / totalCalls) * 100) : 0;

  // Group logs per provider
  const providerLogs = {};
  for (const log of aiLogs) {
    const prov = log.provider || 'unknown';
    if (!providerLogs[prov]) providerLogs[prov] = [];
    providerLogs[prov].push(log);
  }

  const providers = {};
  for (const [prov, logs] of Object.entries(providerLogs)) {
    const calls = logs.length;
    const okCalls = logs.filter((l) => l.ok).length;
    const provSuccessRate = calls > 0 ? round2((okCalls / calls) * 100) : 0;
    const latencies = logs.map((l) => l.latencyMs);
    const avgLatencyMs =
      latencies.length > 0
        ? round2(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
    const p95LatencyMs = calculatePercentile(latencies, 0.95);

    providers[prov] = {
      calls,
      successRate: provSuccessRate,
      avgLatencyMs,
      p95LatencyMs
    };
  }

  // Format categorization by source
  const categorizationBySource = {
    memory: 0,
    llm: 0,
    rule: 0,
    default: 0,
    manual: 0,
    import: 0
  };
  for (const item of sourceCounts) {
    if (categorizationBySource[item._id] !== undefined) {
      categorizationBySource[item._id] = item.count;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      totalCalls,
      successRate,
      fallbackRate,
      providers,
      categorizationBySource,
      memoryEntries
    }
  });
};

/**
 * Budget optimization endpoint.
 * POST /api/ai/budget-optimize
 */
export const getBudgetOptimization = async (req, res) => {
  const currentKey = currentMonthKey();
  const prior4Keys = lastNMonthKeys(4, currentKey);
  const complete3MonthKeys = prior4Keys.slice(0, 3);

  const oldestMonth = parseMonthParam(complete3MonthKeys[0]);
  const newestMonth = parseMonthParam(complete3MonthKeys[complete3MonthKeys.length - 1]);

  const windowStart = getMonthRange(oldestMonth.year, oldestMonth.month).start;
  const windowEnd = getMonthRange(newestMonth.year, newestMonth.month).end;

  const [transactions, currentBudget] = await Promise.all([
    Transaction.find({
      userId: req.userId,
      transactionDate: { $gte: windowStart, $lt: windowEnd }
    }).lean(),
    Budget.findOne({ userId: req.userId }).lean()
  ]);

  if (transactions.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        suggestions: null,
        reason: 'not_enough_data'
      }
    });
  }

  const numMonths = Math.max(1, complete3MonthKeys.length);
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};

  for (const t of transactions) {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else if (t.type === 'expense') {
      totalExpense += t.amount;
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
  }

  const averageIncome = round2(totalIncome / numMonths);
  const averageExpense = round2(totalExpense / numMonths);
  const categoryAverages = {};
  for (const [cat, sumAmt] of Object.entries(categoryTotals)) {
    categoryAverages[cat] = round2(sumAmt / numMonths);
  }

  const result = await optimizeBudget({
    userId: req.userId,
    averageIncome,
    averageExpense,
    categoryAverages,
    currentBudget
  });

  res.status(200).json({
    success: true,
    data: result
  });
};

/**
 * Financial insights endpoint.
 * POST /api/ai/insights
 */
export const getFinancialInsights = async (req, res) => {
  const monthKey = req.query.month || req.body?.month || currentMonthKey();
  const force = req.query.force === '1' || req.query.force === 'true' || Boolean(req.body?.force);

  let year, month;
  try {
    const parsed = parseMonthParam(monthKey);
    year = parsed.year;
    month = parsed.month;
  } catch (err) { // eslint-disable-line no-unused-vars
    return res.status(400).json({ success: false, message: 'Invalid month parameter' });
  }

  const range = getMonthRange(year, month);
  const prior4Keys = lastNMonthKeys(4, monthKey);
  const oldestMonth = parseMonthParam(prior4Keys[0]);
  const historyStart = getMonthRange(oldestMonth.year, oldestMonth.month).start;

  const [monthTxns, historyTxns, budget] = await Promise.all([
    Transaction.find({
      userId: req.userId,
      transactionDate: { $gte: range.start, $lt: range.end }
    }).lean(),
    Transaction.find({
      userId: req.userId,
      transactionDate: { $gte: historyStart, $lt: range.end }
    }).lean(),
    Budget.findOne({ userId: req.userId }).lean()
  ]);

  const monthSummary = summarizeMonth(monthTxns, budget);
  const forecastResult = forecast({
    transactions: historyTxns,
    budget,
    now: new Date()
  });

  // Calculate top categories and category overruns
  const topCategories = (monthSummary.categoryBreakdown || []).slice(0, 3);
  const categoriesOverBudget = [];
  if (budget?.categoryBudgets) {
    const spendMap = new Map((monthSummary.categoryBreakdown || []).map((c) => [c.category, c.amount]));
    for (const cb of budget.categoryBudgets) {
      const spent = spendMap.get(cb.category) || 0;
      if (spent > cb.limit) {
        categoriesOverBudget.push({
          category: cb.category,
          spent,
          limit: cb.limit,
          overBy: spent - cb.limit
        });
      }
    }
  }

  const facts = {
    month: monthKey,
    totalIncome: monthSummary.totalIncome,
    totalExpense: monthSummary.totalExpense,
    savings: monthSummary.savings,
    savingsRate: monthSummary.savingsRate,
    budgetRemaining: monthSummary.budgetRemaining,
    budgetUsagePercent: monthSummary.budgetUsagePercent,
    monthlyBudget: budget?.monthlyBudget || null,
    forecastTotal: forecastResult.projectedTotal,
    forecastRisk: forecastResult.budgetRisk,
    topCategories,
    categoriesOverBudget
  };

  const result = await generateInsights({
    userId: req.userId,
    month: monthKey,
    facts,
    force
  });

  res.status(200).json({
    success: true,
    data: result
  });
};

export default {
  categorizeTransaction,
  predictSpending,
  getAiStats,
  getBudgetOptimization,
  getFinancialInsights,
  calculatePercentile
};
