import { forecast } from '../src/services/analytics/forecast.js';

describe('Analytics forecast.js', () => {
  const mockNow = new Date('2026-10-15T12:00:00.000Z'); // Day 15 of October (31 days)

  it('should forecast using only projectedMonthEnd when no historical data exists', () => {
    const transactions = [
      { type: 'expense', amount: 15000, transactionDate: new Date('2026-10-05T10:00:00Z') }
    ];

    const res = forecast({
      transactions,
      budget: { monthlyBudget: 40000 },
      now: mockNow,
      tzOffsetMinutes: 0
    });

    expect(res.currentMonth.month).toBe('2026-10');
    expect(res.currentMonth.spentToDate).toBe(15000);
    expect(res.currentMonth.daysElapsed).toBe(15);
    expect(res.currentMonth.daysInMonth).toBe(31);

    // Run-rate: (15000 / 15) * 31 = 31000
    expect(res.currentMonth.projectedMonthEnd).toBe(31000);
    expect(res.monthsOfData).toBe(0);
    expect(res.historicalAverage).toBe(0);
    expect(res.predictedExpense).toBe(31000);
    expect(res.budgetRisk).toBe(false); // 31000 <= 40000
    expect(res.confidence).toBeGreaterThanOrEqual(30);
    expect(res.confidence).toBeLessThanOrEqual(50);
  });

  it('should blend projectedMonthEnd with historicalAverage when prior months exist', () => {
    const transactions = [
      // September (prior month 1): 20000
      { type: 'expense', amount: 20000, transactionDate: new Date('2026-09-10T10:00:00Z') },
      // August (prior month 2): 22000
      { type: 'expense', amount: 22000, transactionDate: new Date('2026-08-10T10:00:00Z') },
      // July (prior month 3): 18000
      { type: 'expense', amount: 18000, transactionDate: new Date('2026-07-10T10:00:00Z') },
      // October (current month): 15000 in 15 days -> projected is 31000
      { type: 'expense', amount: 15000, transactionDate: new Date('2026-10-05T10:00:00Z') }
    ];

    const res = forecast({
      transactions,
      budget: { monthlyBudget: 22000 },
      now: mockNow,
      tzOffsetMinutes: 0
    });

    expect(res.monthsOfData).toBe(3);
    // Historical avg = (20000 + 22000 + 18000) / 3 = 20000
    expect(res.historicalAverage).toBe(20000);
    expect(res.currentMonth.projectedMonthEnd).toBe(31000);

    // Blended weight on day 15: w = 15 / 31 = ~0.48387
    // predicted = (0.48387 * 31000) + ((1 - 0.48387) * 20000) = 15000 + 10322.58 = 25322.58
    expect(res.predictedExpense).toBe(25322.58);

    // Budget risk is true because predictedExpense (25322.58) > monthlyBudget (22000)
    expect(res.budgetRisk).toBe(true);

    // Confidence with 3 months of data and low variance is high (~80-90)
    expect(res.confidence).toBeGreaterThanOrEqual(75);
    expect(res.confidence).toBeLessThanOrEqual(90);
  });

  it('should decrease confidence when historical variance is high', () => {
    const steadyTransactions = [
      { type: 'expense', amount: 20000, transactionDate: new Date('2026-09-10T10:00:00Z') },
      { type: 'expense', amount: 20500, transactionDate: new Date('2026-08-10T10:00:00Z') },
      { type: 'expense', amount: 10000, transactionDate: new Date('2026-10-05T10:00:00Z') }
    ];

    const volatileTransactions = [
      { type: 'expense', amount: 5000, transactionDate: new Date('2026-09-10T10:00:00Z') },
      { type: 'expense', amount: 45000, transactionDate: new Date('2026-08-10T10:00:00Z') },
      { type: 'expense', amount: 10000, transactionDate: new Date('2026-10-05T10:00:00Z') }
    ];

    const steadyRes = forecast({
      transactions: steadyTransactions,
      budget: null,
      now: mockNow,
      tzOffsetMinutes: 0
    });

    const volatileRes = forecast({
      transactions: volatileTransactions,
      budget: null,
      now: mockNow,
      tzOffsetMinutes: 0
    });

    expect(steadyRes.confidence).toBeGreaterThan(volatileRes.confidence);
  });
});

