import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import groqProvider from '../src/services/llm/providers/groq.js';
import geminiProvider from '../src/services/llm/providers/gemini.js';

describe('AI P5 Endpoints (/api/ai/budget-optimize & /api/ai/insights)', () => {
  let token;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    const signupRes = await request(app).post('/api/auth/signup').send({
      name: 'P5 User',
      email: 'p5.user@example.com',
      password: 'password123'
    });
    token = signupRes.body.token;
  });

  describe('POST /api/ai/budget-optimize', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).post('/api/ai/budget-optimize');
      expect(res.status).toBe(401);
    });

    it('should return reason: "not_enough_data" when user has no transaction history', async () => {
      const res = await request(app)
        .post('/api/ai/budget-optimize')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reason).toBe('not_enough_data');
      expect(res.body.data.suggestions).toBeNull();
    });

    it('should return budget optimization suggestions based on historical data', async () => {
      // Seed transactions across prior complete months (2026-07, 2026-08, 2026-09)
      for (const d of ['2026-07-01', '2026-08-01', '2026-09-01']) {
        await request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Monthly Salary',
            amount: 80000,
            type: 'income',
            category: 'Salary',
            transactionDate: d
          });
      }

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Grocery Mart',
          amount: 15000,
          type: 'expense',
          category: 'Food',
          transactionDate: '2026-08-05'
        });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Apartment Rent',
          amount: 22000,
          type: 'expense',
          category: 'Rent',
          transactionDate: '2026-09-01'
        });

      // Mock Groq provider
      jest.spyOn(groqProvider, 'call').mockResolvedValue({
        text: JSON.stringify({
          suggestedMonthlyBudget: 45000,
          categoryLimits: [
            { category: 'Rent', suggestedLimit: 22000, reason: 'Fixed rent' },
            { category: 'Food', suggestedLimit: 14000, reason: 'Grocery limit' }
          ],
          tips: ['Cook at home more often', 'Track weekly spending']
        })
      });

      const res = await request(app)
        .post('/api/ai/budget-optimize')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suggestions).toBeDefined();
      expect(res.body.data.suggestions.suggestedMonthlyBudget).toBe(45000);
      expect(res.body.data.suggestions.categoryLimits.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/ai/insights', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).post('/api/ai/insights');
      expect(res.status).toBe(401);
    });

    it('should return financial insights using heuristic fallback when LLM is unavailable', async () => {
      // Both providers fail
      jest.spyOn(groqProvider, 'call').mockRejectedValue(new Error('Down'));
      jest.spyOn(geminiProvider, 'call').mockRejectedValue(new Error('Down'));

      // Seed a transaction in current month
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Electricity Bill',
          amount: 2500,
          type: 'expense',
          category: 'Utilities',
          transactionDate: new Date().toISOString()
        });

      const res = await request(app)
        .post('/api/ai/insights')
        .set('Authorization', `Bearer ${token}`)
        .send({ force: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.provider).toBe('heuristic');
      expect(res.body.data.insights.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.insights[0].title).toBeDefined();
      expect(res.body.data.insights[0].severity).toBeDefined();
    });
  });
});
