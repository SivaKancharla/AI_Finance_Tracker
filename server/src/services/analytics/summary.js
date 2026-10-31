import {
  currentMonthKey,
  lastNMonthKeys,
  DEFAULT_TZ_OFFSET_MINUTES
} from './dateRange.js';

export function round2(num) {
  if (typeof num !== 'number' || isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Summarizes financial transactions for a month against a user's budget.
 * Pure function: does not mutate inputs or query databases.
 * 
 * @param {Array} transactions Month-filtered transaction records
 * @param {Object} budget User's budget document/object or null
 * @returns {Object}
 */
export function summarizeMonth(transactions = [], budget = null) {
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryExpenses = {};

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
    } else if (t.type === 'expense') {
      totalExpense += amt;
      const cat = t.category || 'Other';
      categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amt;
    }
  }

  totalIncome = round2(totalIncome);
  totalExpense = round2(totalExpense);
  const savings = round2(totalIncome - totalExpense);

  const monthlyBudget = round2(budget?.monthlyBudget || 0);

  // budgetRemaining = monthlyBudget - totalExpense when monthlyBudget > 0, otherwise null
  const budgetRemaining = monthlyBudget > 0 ? round2(monthlyBudget - totalExpense) : null;
  const budgetUsedPercent = monthlyBudget > 0 ? round2((totalExpense / monthlyBudget) * 100) : 0;

  // Category breakdown for expenses
  const categoryBreakdown = Object.entries(categoryExpenses)
    .map(([category, amount]) => ({
      category,
      amount: round2(amount),
      percent: totalExpense > 0 ? round2((amount / totalExpense) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // Category budget status
  const budgetCategories = budget?.categoryBudgets || [];
  const categoryBudgetStatus = budgetCategories.map((item) => {
    const spent = round2(categoryExpenses[item.category] || 0);
    const limit = round2(item.limit || 0);
    const percent = limit > 0 ? round2((spent / limit) * 100) : 0;
    return {
      category: item.category,
      limit,
      spent,
      percent,
      over: spent > limit
    };
  });

  return {
    totalIncome,
    totalExpense,
    savings,
    monthlyBudget,
    budgetRemaining,
    budgetUsedPercent,
    categoryBreakdown,
    categoryBudgetStatus
  };
}

/**
 * Builds a month-by-month financial trend for the last N months.
 * Guarantees all N months are present in output even if activity is zero.
 * 
 * @param {Array} transactions Transactions covering the N-month window
 * @param {number} months Number of months (default 6)
 * @param {string} targetMonthKey Final month key (default current month)
 * @param {number} tzOffsetMinutes Timezone offset
 * @returns {Array<{ month: string, income: number, expense: number, savings: number }>}
 */
export function buildTrend(
  transactions = [],
  months = 6,
  targetMonthKey = currentMonthKey(),
  tzOffsetMinutes = DEFAULT_TZ_OFFSET_MINUTES
) {
  const monthKeys = lastNMonthKeys(months, targetMonthKey);
  const monthlyTotals = {};

  for (const k of monthKeys) {
    monthlyTotals[k] = { income: 0, expense: 0 };
  }

  for (const t of transactions) {
    if (!t.transactionDate) continue;
    const dateObj = t.transactionDate instanceof Date ? t.transactionDate : new Date(t.transactionDate);
    const key = currentMonthKey(dateObj, tzOffsetMinutes);
    if (monthlyTotals[key]) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        monthlyTotals[key].income += amt;
      } else if (t.type === 'expense') {
        monthlyTotals[key].expense += amt;
      }
    }
  }

  return monthKeys.map((k) => {
    const inc = round2(monthlyTotals[k].income);
    const exp = round2(monthlyTotals[k].expense);
    return {
      month: k,
      income: inc,
      expense: exp,
      savings: round2(inc - exp)
    };
  });
}

export default {
  round2,
  summarizeMonth,
  buildTrend
};

