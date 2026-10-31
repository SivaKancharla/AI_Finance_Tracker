import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import {
  currentMonthKey,
  parseMonthParam,
  getMonthRange,
  lastNMonthKeys
} from '../services/analytics/dateRange.js';
import { summarizeMonth, buildTrend } from '../services/analytics/summary.js';
import { forecast } from '../services/analytics/forecast.js';

export const getDashboardSummary = async (req, res) => {
  const targetMonth = req.query.month ? req.query.month.trim() : currentMonthKey();

  let parsedMonth;
  try {
    parsedMonth = parseMonthParam(targetMonth);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // 6-month window for trend and forecast calculations
  const trendKeys = lastNMonthKeys(6, targetMonth);
  const oldestMonth = parseMonthParam(trendKeys[0]);
  const windowStart = getMonthRange(oldestMonth.year, oldestMonth.month).start;
  const windowEnd = getMonthRange(parsedMonth.year, parsedMonth.month).end;

  // Single-month window for summary
  const currentMonthRange = getMonthRange(parsedMonth.year, parsedMonth.month);

  // Parallel database queries strictly scoped by userId
  const [windowTransactions, budget, recentTransactions] = await Promise.all([
    Transaction.find({
      userId: req.userId,
      transactionDate: { $gte: windowStart, $lt: windowEnd }
    })
      .sort({ transactionDate: -1, _id: -1 })
      .lean(),
    Budget.findOne({ userId: req.userId }).lean(),
    Transaction.find({ userId: req.userId })
      .sort({ transactionDate: -1, _id: -1 })
      .limit(5)
      .lean()
  ]);

  // Filter current month transactions from the 6-month window in memory
  const currentMonthTransactions = windowTransactions.filter((t) => {
    const d = new Date(t.transactionDate);
    return d >= currentMonthRange.start && d < currentMonthRange.end;
  });

  const summary = summarizeMonth(currentMonthTransactions, budget);
  const trend = buildTrend(windowTransactions, 6, targetMonth);
  const forecastData = forecast({
    transactions: windowTransactions,
    budget,
    now: new Date()
  });

  res.status(200).json({
    success: true,
    data: {
      month: targetMonth,
      summary,
      trend,
      recentTransactions,
      forecast: forecastData
    }
  });
};

export default {
  getDashboardSummary
};

