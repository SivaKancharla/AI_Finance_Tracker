import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';

describe('Analytics & Reports Endpoints', () => {
  let token;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    const signupRes = await request(app).post('/api/auth/signup').send({
      name: 'Analytics User',
      email: 'analytics@example.com',
      password: 'password123'
    });
    token = signupRes.body.token;

    // Set a budget
    await request(app)
      .post('/api/budget')
      .set('Authorization', `Bearer ${token}`)
      .send({
        monthlyBudget: 50000,
        categoryBudgets: [{ category: 'Food', limit: 15000 }]
      });

    // Create seed transactions
    // October 2026
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'income',
        title: 'Salary Oct',
        amount: 80000,
        category: 'Salary',
        transactionDate: '2026-10-01'
      });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        title: 'Swiggy Dinner',
        amount: 2500,
        category: 'Food',
        transactionDate: '2026-10-05'
      });

    // September 2026
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        title: 'September Rent',
        amount: 15000,
        category: 'Rent',
        transactionDate: '2026-09-05'
      });
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return complete summary, 6-month trend, recent transactions, and forecast', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary?month=2026-10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(data.month).toBe('2026-10');

      // Summary checks
      expect(data.summary.totalIncome).toBe(80000);
      expect(data.summary.totalExpense).toBe(2500);
      expect(data.summary.monthlyBudget).toBe(50000);
      expect(data.summary.budgetRemaining).toBe(47500);
      expect(data.summary.categoryBreakdown.length).toBeGreaterThan(0);

      // Trend checks
      expect(data.trend.length).toBe(6);
      expect(data.trend[5].month).toBe('2026-10');

      // Recent transactions
      expect(data.recentTransactions.length).toBeGreaterThan(0);

      // Forecast checks
      expect(data.forecast).toBeDefined();
      expect(data.forecast.method).toBe('run_rate_blend');
    });

    it('should reject invalid month formats', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary?month=invalid-month')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/predict', () => {
    it('should return spending forecast object', async () => {
      const res = await request(app)
        .post('/api/ai/predict')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentMonth).toBeDefined();
      expect(res.body.data.method).toBe('run_rate_blend');
    });
  });

  describe('GET /api/reports/monthly', () => {
    it('should return JSON report by default', async () => {
      const res = await request(app)
        .get('/api/reports/monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBe('2026-10');
      expect(res.body.data.summary.totalIncome).toBe(80000);
      expect(res.body.data.transactions.length).toBe(2);
    });

    it('should stream PDF file when format=pdf is requested', async () => {
      const res = await request(app)
        .get('/api/reports/monthly?year=2026&month=10&format=pdf')
        .set('Authorization', `Bearer ${token}`)
        .buffer(true); // Supertest buffer mode for binary content

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/finance-report-2026-10\.pdf/);

      // Check PDF header signature '%PDF-'
      const pdfHeader = res.body.slice(0, 5).toString('utf-8');
      expect(pdfHeader).toBe('%PDF-');
    });
  });
});

