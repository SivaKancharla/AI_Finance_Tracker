import { summarizeMonth, buildTrend, round2 } from '../src/services/analytics/summary.js';

describe('Analytics summary.js', () => {
  describe('round2 helper', () => {
    it('should round numbers to 2 decimals accurately', () => {
      expect(round2(10.555)).toBe(10.56);
      expect(round2(10.554)).toBe(10.55);
      expect(round2(0)).toBe(0);
      expect(round2(null)).toBe(0);
    });
  });

  describe('summarizeMonth', () => {
    const transactions = [
      { type: 'income', amount: 80000, category: 'Salary' },
      { type: 'income', amount: 5000, category: 'Freelance' },
      { type: 'expense', amount: 15000, category: 'Rent' },
      { type: 'expense', amount: 4500, category: 'Food' },
      { type: 'expense', amount: 2500, category: 'Food' },
      { type: 'expense', amount: 3000, category: 'Transport' }
    ];

    const budget = {
      monthlyBudget: 30000,
      categoryBudgets: [
        { category: 'Food', limit: 8000 },
        { category: 'Rent', limit: 14000 }, // Overspent by 1000
        { category: 'Transport', limit: 5000 }
      ]
    };

    it('should calculate totalIncome, totalExpense, and savings', () => {
      const res = summarizeMonth(transactions, budget);
      expect(res.totalIncome).toBe(85000);
      expect(res.totalExpense).toBe(25000);
      expect(res.savings).toBe(60000);
    });

    it('should calculate budgetRemaining and budgetUsedPercent when budget is set', () => {
      const res = summarizeMonth(transactions, budget);
      expect(res.monthlyBudget).toBe(30000);
      expect(res.budgetRemaining).toBe(5000); // 30000 - 25000
      expect(res.budgetUsedPercent).toBe(83.33); // (25000 / 30000) * 100
    });

    it('should return budgetRemaining: null when monthlyBudget is 0 or not set', () => {
      const noBudgetRes = summarizeMonth(transactions, null);
      expect(noBudgetRes.monthlyBudget).toBe(0);
      expect(noBudgetRes.budgetRemaining).toBeNull();
      expect(noBudgetRes.budgetUsedPercent).toBe(0);
      // Ensure budgetRemaining is NOT substituted with savings
      expect(noBudgetRes.budgetRemaining).not.toBe(noBudgetRes.savings);
    });

    it('should calculate categoryBreakdown with sorted amounts and percentages', () => {
      const res = summarizeMonth(transactions, budget);
      expect(res.categoryBreakdown).toEqual([
        { category: 'Rent', amount: 15000, percent: 60 },
        { category: 'Food', amount: 7000, percent: 28 },
        { category: 'Transport', amount: 3000, percent: 12 }
      ]);
    });

    it('should calculate categoryBudgetStatus and flag overspent categories', () => {
      const res = summarizeMonth(transactions, budget);
      expect(res.categoryBudgetStatus).toEqual([
        {
          category: 'Food',
          limit: 8000,
          spent: 7000,
          percent: 87.5,
          over: false
        },
        {
          category: 'Rent',
          limit: 14000,
          spent: 15000,
          percent: 107.14,
          over: true // Over budget!
        },
        {
          category: 'Transport',
          limit: 5000,
          spent: 3000,
          percent: 60,
          over: false
        }
      ]);
    });
  });

  describe('buildTrend', () => {
    it('should build exactly 6 months of trend data with 0s for empty months', () => {
      const transactions = [
        { type: 'income', amount: 50000, transactionDate: new Date('2026-10-05T10:00:00Z') },
        { type: 'expense', amount: 20000, transactionDate: new Date('2026-10-12T10:00:00Z') },
        { type: 'expense', amount: 15000, transactionDate: new Date('2026-08-15T10:00:00Z') }
      ];

      const trend = buildTrend(transactions, 6, '2026-10', 0);

      expect(trend.length).toBe(6);
      expect(trend.map((t) => t.month)).toEqual([
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
        '2026-10'
      ]);

      // 2026-08
      expect(trend[3]).toEqual({
        month: '2026-08',
        income: 0,
        expense: 15000,
        savings: -15000
      });

      // 2026-09 (Empty month)
      expect(trend[4]).toEqual({
        month: '2026-09',
        income: 0,
        expense: 0,
        savings: 0
      });

      // 2026-10
      expect(trend[5]).toEqual({
        month: '2026-10',
        income: 50000,
        expense: 20000,
        savings: 30000
      });
    });
  });
});

