import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import {
  currentMonthKey,
  parseMonthParam,
  getMonthRange,
  lastNMonthKeys
} from '../services/analytics/dateRange.js';
import { forecast } from '../services/analytics/forecast.js';

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

export default {
  predictSpending
};

