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
import { round2 } from '../services/analytics/summary.js';

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

export default {
  categorizeTransaction,
  predictSpending,
  getAiStats,
  calculatePercentile
};
