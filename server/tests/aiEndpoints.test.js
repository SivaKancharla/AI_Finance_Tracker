import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import User from '../src/models/User.js';
import CategoryMemory from '../src/models/CategoryMemory.js';
import AiCallLog from '../src/models/AiCallLog.js';
import groqProvider from '../src/services/llm/providers/groq.js';
import geminiProvider from '../src/services/llm/providers/gemini.js';

describe('AI API Endpoints (/api/ai)', () => {
  let token;
  let user;

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
      name: 'Siva AI Test',
      email: 'siva.ai@example.com',
      password: 'password123'
    });

    token = signupRes.body.token;
    user = signupRes.body.user;
  });

  describe('POST /api/ai/categorize', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/ai/categorize')
        .send({ title: 'Swiggy' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when title is missing or empty', async () => {
      const res = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return category from CategoryMemory when matched', async () => {
      await CategoryMemory.create({
        userId: user.id,
        key: 'chai point',
        category: 'Food',
        confidence: 1.0,
        source: 'user'
      });

      const res = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Chai Point' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Food');
      expect(res.body.data.source).toBe('memory');
    });

    it('should call LLM and return categorization for new merchant', async () => {
      jest.spyOn(groqProvider, 'call').mockResolvedValue({
        text: JSON.stringify({
          results: [
            { id: '0', category: 'Shopping', merchant: 'Zara', confidence: 0.94 }
          ]
        })
      });

      const res = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Zara Store Mumbai', amount: 3500 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Shopping');
      expect(res.body.data.merchant).toBe('Zara');
      expect(res.body.data.source).toBe('llm');
      expect(res.body.data.confidence).toBe(0.94);
      expect(res.body.data.needsReview).toBe(false);
    });

    it('should fallback to ruleCategorizer when all LLM providers fail', async () => {
      jest.spyOn(geminiProvider, 'call').mockRejectedValue(new Error('Quota limit'));
      jest.spyOn(groqProvider, 'call').mockRejectedValue(new Error('Connection error'));

      const res = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Uber Trip Delhi', amount: 450 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Transport');
      expect(res.body.data.source).toBe('rule');
    });
  });

  describe('GET /api/ai/stats', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/ai/stats');
      expect(res.status).toBe(401);
    });

    it('should return aggregated AI observability statistics', async () => {
      // Seed some AiCallLog entries
      await AiCallLog.create([
        {
          userId: user.id,
          task: 'categorize',
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          ok: true,
          latencyMs: 340,
          attempt: 1,
          inputChars: 500,
          outputChars: 120,
          promptVersion: 'v1'
        },
        {
          userId: user.id,
          task: 'categorize',
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          ok: false,
          latencyMs: 1200,
          attempt: 1,
          inputChars: 500,
          outputChars: 0,
          errorType: 'timeout',
          promptVersion: 'v1'
        }
      ]);

      const res = await request(app)
        .get('/api/ai/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { data } = res.body;

      expect(data.totalCalls).toBe(2);
      expect(data.successRate).toBe(50);
      expect(data.fallbackRate).toBe(0);
      expect(data.providers.groq).toBeDefined();
      expect(data.providers.groq.calls).toBe(2);
      expect(data.providers.groq.successRate).toBe(50);
      expect(data.categorizationBySource).toBeDefined();
      expect(typeof data.memoryEntries).toBe('number');
    });
  });
});
