import {
  repairBudgetSuggestions,
  buildHeuristicBudget,
  optimizeBudget
} from '../src/services/ai/budgetOptimizer.js';
import groqProvider from '../src/services/llm/providers/groq.js';
import geminiProvider from '../src/services/llm/providers/gemini.js';
import { jest } from '@jest/globals';

describe('AI Budget Optimizer (budgetOptimizer.js)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('repairBudgetSuggestions', () => {
    it('should drop unknown or duplicate categories and clamp negatives', () => {
      const rawData = {
        suggestedMonthlyBudget: 40000,
        categoryLimits: [
          { category: 'Food', suggestedLimit: 12000, reason: 'Grocery and dining' },
          { category: 'Food', suggestedLimit: 8000, reason: 'Duplicate Food' },
          { category: 'InvalidCategoryXYZ', suggestedLimit: 5000, reason: 'Fake' },
          { category: 'Transport', suggestedLimit: -500, reason: 'Negative' }
        ],
        tips: ['Tip 1', 'Tip 2']
      };

      const repaired = repairBudgetSuggestions(rawData, { averageIncome: 50000 });
      expect(repaired.categoryLimits.length).toBe(2); // Food and Transport
      expect(repaired.categoryLimits[0].category).toBe('Food');
      expect(repaired.categoryLimits[0].suggestedLimit).toBe(12000);
      expect(repaired.categoryLimits[1].category).toBe('Transport');
      expect(repaired.categoryLimits[1].suggestedLimit).toBe(0); // Clamped to 0
    });

    it('should cap suggestedMonthlyBudget to averageIncome if income is known', () => {
      const rawData = {
        suggestedMonthlyBudget: 80000,
        categoryLimits: [
          { category: 'Food', suggestedLimit: 20000, reason: 'High food' }
        ],
        tips: []
      };

      const repaired = repairBudgetSuggestions(rawData, { averageIncome: 50000 });
      expect(repaired.suggestedMonthlyBudget).toBe(50000);
    });

    it('should scale category limits down proportionally if their sum exceeds the monthly budget', () => {
      const rawData = {
        suggestedMonthlyBudget: 20000,
        categoryLimits: [
          { category: 'Food', suggestedLimit: 15000, reason: 'Food' },
          { category: 'Shopping', suggestedLimit: 15000, reason: 'Shopping' }
        ],
        tips: []
      };

      // Sum of limits is 30,000, budget is 20,000 -> scale factor 20/30 = 2/3
      const repaired = repairBudgetSuggestions(rawData, { averageIncome: 40000 });
      expect(repaired.suggestedMonthlyBudget).toBe(20000);
      expect(repaired.categoryLimits[0].suggestedLimit).toBe(10000);
      expect(repaired.categoryLimits[1].suggestedLimit).toBe(10000);
    });

    it('should cap tips array at maximum 4 tips', () => {
      const rawData = {
        suggestedMonthlyBudget: 30000,
        categoryLimits: [],
        tips: ['Tip 1', 'Tip 2', 'Tip 3', 'Tip 4', 'Tip 5', 'Tip 6']
      };

      const repaired = repairBudgetSuggestions(rawData);
      expect(repaired.tips.length).toBe(4);
    });
  });

  describe('buildHeuristicBudget', () => {
    it('should calculate fixed categories at 100% and flexible categories at 90%', () => {
      const categoryAverages = {
        Rent: 15000,    // Fixed
        Food: 10000,    // Flexible
        Shopping: 6000  // Flexible
      };

      const res = buildHeuristicBudget({
        averageIncome: 50000,
        averageExpense: 31000,
        categoryAverages
      });

      expect(res.suggestedMonthlyBudget).toBeDefined();

      const rent = res.categoryLimits.find((c) => c.category === 'Rent');
      expect(rent.suggestedLimit).toBe(15000); // 100% of 15000

      const food = res.categoryLimits.find((c) => c.category === 'Food');
      expect(food.suggestedLimit).toBe(9000); // 90% of 10000

      const shopping = res.categoryLimits.find((c) => c.category === 'Shopping');
      expect(shopping.suggestedLimit).toBe(5400); // 90% of 6000

      expect(res.tips.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('optimizeBudget', () => {
    it('should return reason: "not_enough_data" when user has zero expenses', async () => {
      const res = await optimizeBudget({
        userId: 'user123',
        averageIncome: 50000,
        averageExpense: 0,
        categoryAverages: {}
      });

      expect(res.provider).toBe('none');
      expect(res.suggestions).toBeNull();
      expect(res.reason).toBe('not_enough_data');
    });

    it('should fall back to heuristic when LLM providers throw an error', async () => {
      jest.spyOn(groqProvider, 'call').mockRejectedValue(new Error('Quota reached'));
      jest.spyOn(geminiProvider, 'call').mockRejectedValue(new Error('Service unavailable'));

      const res = await optimizeBudget({
        userId: 'user123',
        averageIncome: 60000,
        averageExpense: 30000,
        categoryAverages: { Food: 12000, Rent: 18000 }
      });

      expect(res.provider).toBe('heuristic');
      expect(res.suggestions).not.toBeNull();
      expect(res.suggestions.suggestedMonthlyBudget).toBeGreaterThan(0);
      expect(res.suggestions.categoryLimits.length).toBe(2);
    });
  });
});
