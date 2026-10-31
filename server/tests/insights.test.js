import {
  buildHeuristicInsights,
  generateInsights
} from '../src/services/ai/insights.js';
import groqProvider from '../src/services/llm/providers/groq.js';
import geminiProvider from '../src/services/llm/providers/gemini.js';
import { jest } from '@jest/globals';

describe('Financial Insights Engine (insights.js)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('buildHeuristicInsights', () => {
    it('should generate critical alert when budget is 100% exceeded', () => {
      const facts = {
        totalIncome: 75000,
        totalExpense: 55000,
        monthlyBudget: 50000,
        budgetRemaining: -5000,
        budgetUsagePercent: 110,
        savings: 20000,
        savingsRate: 26.67
      };

      const insights = buildHeuristicInsights(facts);
      const budgetAlert = insights.find((i) => i.title.includes('Budget Exceeded'));

      expect(budgetAlert).toBeDefined();
      expect(budgetAlert.severity).toBe('critical');
    });

    it('should generate warning alert when budget usage is between 80% and 99%', () => {
      const facts = {
        totalIncome: 80000,
        totalExpense: 42000,
        monthlyBudget: 50000,
        budgetRemaining: 8000,
        budgetUsagePercent: 84
      };

      const insights = buildHeuristicInsights(facts);
      const budgetWarning = insights.find((i) => i.title.includes('Approaching Budget Limit'));

      expect(budgetWarning).toBeDefined();
      expect(budgetWarning.severity).toBe('warning');
    });

    it('should generate category overrun alert for specific categories', () => {
      const facts = {
        totalExpense: 30000,
        categoriesOverBudget: [
          { category: 'Shopping', spent: 12000, limit: 8000, overBy: 4000 }
        ]
      };

      const insights = buildHeuristicInsights(facts);
      const shoppingAlert = insights.find((i) => i.category === 'Shopping');

      expect(shoppingAlert).toBeDefined();
      expect(shoppingAlert.title).toContain('Shopping Budget Alert');
      expect(shoppingAlert.severity).toBe('warning');
    });

    it('should limit total insights to at most 6', () => {
      const facts = {
        totalIncome: 100000,
        totalExpense: 85000,
        monthlyBudget: 80000,
        budgetRemaining: -5000,
        budgetUsagePercent: 106.25,
        savings: 15000,
        savingsRate: 15,
        forecastRisk: true,
        forecastTotal: 92000,
        topCategories: [{ category: 'Food', percentage: 35, amount: 29750 }],
        categoriesOverBudget: [
          { category: 'Food', spent: 29750, limit: 20000, overBy: 9750 },
          { category: 'Shopping', spent: 15000, limit: 10000, overBy: 5000 }
        ]
      };

      const insights = buildHeuristicInsights(facts);
      expect(insights.length).toBeLessThanOrEqual(6);
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe('generateInsights', () => {
    const userId = 'user-insights-123';
    const month = '2026-10';
    const sampleFacts = {
      totalIncome: 60000,
      totalExpense: 25000,
      monthlyBudget: 40000,
      budgetRemaining: 15000,
      budgetUsagePercent: 62.5
    };

    it('should return heuristic insights when LLM providers throw an error', async () => {
      jest.spyOn(groqProvider, 'call').mockRejectedValue(new Error('Down'));
      jest.spyOn(geminiProvider, 'call').mockRejectedValue(new Error('Down'));

      const res = await generateInsights({
        userId,
        month,
        facts: sampleFacts,
        force: true
      });

      expect(res.provider).toBe('heuristic');
      expect(res.insights.length).toBeGreaterThan(0);
    });

    it('should serve cached insights on subsequent calls unless force is true', async () => {
      // First call (populates cache)
      const res1 = await generateInsights({
        userId,
        month,
        facts: sampleFacts,
        force: true
      });

      // Second call without force
      const res2 = await generateInsights({
        userId,
        month,
        facts: sampleFacts,
        force: false
      });

      expect(res2.cached).toBe(true);
      expect(res2.insights).toEqual(res1.insights);
    });
  });
});

