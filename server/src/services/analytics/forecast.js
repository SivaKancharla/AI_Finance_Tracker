import {
  currentMonthKey,
  parseMonthParam,
  getDaysInMonth,
  lastNMonthKeys,
  DEFAULT_TZ_OFFSET_MINUTES
} from './dateRange.js';
import { round2 } from './summary.js';

/**
 * Computes a statistical run-rate spending forecast blended with historical averages.
 * Pure function: deterministic, no LLM, no external calls.
 * 
 * @param {Object} params
 * @param {Array} params.transactions List of transactions (including current and historical months)
 * @param {Object} params.budget User budget object with monthlyBudget
 * @param {Date} [params.now] Current timestamp (default: new Date())
 * @param {number} [params.tzOffsetMinutes] Timezone offset in minutes (default 330)
 * @returns {Object} Forecast object
 */
export function forecast({
  transactions = [],
  budget = null,
  now = new Date(),
  tzOffsetMinutes = DEFAULT_TZ_OFFSET_MINUTES
}) {
  const currentKey = currentMonthKey(now, tzOffsetMinutes);
  const { year, month } = parseMonthParam(currentKey);

  const daysInMonth = getDaysInMonth(year, month);

  // Local calendar day of the month in the target timezone
  const localTime = new Date(now.getTime() + tzOffsetMinutes * 60 * 1000);
  const daysElapsed = Math.min(daysInMonth, Math.max(1, localTime.getUTCDate()));

  // 1. Group transactions into months
  const monthlyExpenses = {};
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.transactionDate) continue;
    const dateObj = t.transactionDate instanceof Date ? t.transactionDate : new Date(t.transactionDate);
    const mKey = currentMonthKey(dateObj, tzOffsetMinutes);
    const amt = Number(t.amount) || 0;
    monthlyExpenses[mKey] = (monthlyExpenses[mKey] || 0) + amt;
  }

  // Current month spent to date
  const spentToDate = round2(monthlyExpenses[currentKey] || 0);

  // Projected month-end from current run-rate
  // Guard daysElapsed = 0 (we clamped to at least 1)
  const projectedMonthEnd = round2((spentToDate / daysElapsed) * daysInMonth);

  // 2. Historical average from up to 3 previous complete months
  // Get 4 months ending in currentKey, drop the currentKey to get the 3 prior months
  const priorMonthKeys = lastNMonthKeys(4, currentKey).slice(0, 3);
  const historicalExpenses = [];

  for (const pKey of priorMonthKeys) {
    if (monthlyExpenses[pKey] !== undefined && monthlyExpenses[pKey] > 0) {
      historicalExpenses.push(monthlyExpenses[pKey]);
    }
  }

  const monthsOfData = historicalExpenses.length;
  let historicalAverage = 0;
  if (monthsOfData > 0) {
    const sum = historicalExpenses.reduce((acc, val) => acc + val, 0);
    historicalAverage = round2(sum / monthsOfData);
  }

  // 3. Predicted expense blend
  let predictedExpense;
  if (monthsOfData >= 1) {
    // Weight the run-rate more as the month progresses
    const w = daysElapsed / daysInMonth;
    predictedExpense = round2(w * projectedMonthEnd + (1 - w) * historicalAverage);
  } else {
    predictedExpense = projectedMonthEnd;
  }

  // 4. Confidence calculation (30 to 90)
  // Base on monthsOfData
  let baseConfidence = 35;
  if (monthsOfData === 1) baseConfidence = 55;
  else if (monthsOfData === 2) baseConfidence = 70;
  else if (monthsOfData >= 3) baseConfidence = 80;

  // Add progression bonus (0 to 10)
  const progressionBonus = Math.round(10 * (daysElapsed / daysInMonth));

  // Subtract variance penalty if we have multiple months of data (up to 15)
  let variancePenalty = 0;
  if (monthsOfData >= 2 && historicalAverage > 0) {
    const variance =
      historicalExpenses.reduce((acc, val) => acc + Math.pow(val - historicalAverage, 2), 0) /
      monthsOfData;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / historicalAverage; // Coefficient of variation
    variancePenalty = Math.min(15, Math.round(cv * 15));
  }

  const rawConfidence = baseConfidence + progressionBonus - variancePenalty;
  const confidence = Math.min(90, Math.max(30, rawConfidence));

  // 5. Budget risk flag
  const monthlyBudget = round2(budget?.monthlyBudget || 0);
  const budgetRisk = monthlyBudget > 0 && predictedExpense > monthlyBudget;

  return {
    currentMonth: {
      month: currentKey,
      spentToDate,
      daysElapsed,
      daysInMonth,
      projectedMonthEnd
    },
    historicalAverage,
    monthsOfData,
    predictedExpense,
    projectedTotal: predictedExpense,
    confidence,
    budgetRisk,
    method: 'run_rate_blend'
  };
}

export default {
  forecast
};

