import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import CategoryMemory from '../src/models/CategoryMemory.js';

describe('Transactions Endpoints (/api/transactions)', () => {
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
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    token = signupRes.body.token;
  });

  describe('POST /api/transactions', () => {
    it('should create a transaction with manual valid category', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense',
          title: 'Grocery Store Run',
          amount: 450,
          category: 'Food',
          paymentMethod: 'upi'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Food');
      expect(res.body.data.categorySource).toBe('manual');
      expect(res.body.data.amount).toBe(450);
    });

    it('should auto-categorize via rule fallback when category is missing', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense',
          title: 'Swiggy Dinner Order',
          amount: 320
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Food');
      expect(res.body.data.categorySource).toBe('rule');
    });

    it('should default to "Other" if unclassifiable when category is omitted', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense',
          title: 'Random Mystery Purchase 9821',
          amount: 100
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Other');
      expect(res.body.data.categorySource).toBe('default');
      expect(res.body.data.needsReview).toBe(true);
    });

    it('should reject invalid category for transaction type', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense',
          title: 'Office Bonus',
          amount: 50000,
          category: 'Salary' // Salary is only valid for income
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/transactions & filtering', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense',
          title: 'Swiggy Biryani',
          amount: 400,
          category: 'Food',
          transactionDate: '2026-10-01'
        });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense',
          title: 'Uber City Cab',
          amount: 250,
          category: 'Transport',
          transactionDate: '2026-10-05'
        });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'income',
          title: 'October Salary',
          amount: 75000,
          category: 'Salary',
          transactionDate: '2026-10-10'
        });
    });

    it('should list all transactions with pagination', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination.total).toBe(3);
    });

    it('should filter by type and category', async () => {
      const incomeRes = await request(app)
        .get('/api/transactions?type=income')
        .set('Authorization', `Bearer ${token}`);

      expect(incomeRes.body.data.length).toBe(1);
      expect(incomeRes.body.data[0].category).toBe('Salary');

      const foodRes = await request(app)
        .get('/api/transactions?category=Food')
        .set('Authorization', `Bearer ${token}`);

      expect(foodRes.body.data.length).toBe(1);
      expect(foodRes.body.data[0].title).toBe('Swiggy Biryani');
    });

    it('should safely search with regex special characters', async () => {
      const searchRes = await request(app)
        .get('/api/transactions?search=Uber+City')
        .set('Authorization', `Bearer ${token}`);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.length).toBe(1);
      expect(searchRes.body.data[0].title).toBe('Uber City Cab');

      // Test searching dangerous characters
      const regexRes = await request(app)
        .get('/api/transactions?search=[.*+?^${}()|[\\\\]]')
        .set('Authorization', `Bearer ${token}`);

      expect(regexRes.status).toBe(200);
      expect(regexRes.body.data.length).toBe(0);
    });

    it('should sort correctly by amount_desc', async () => {
      const res = await request(app)
        .get('/api/transactions?sort=amount_desc')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].amount).toBe(75000);
      expect(res.body.data[2].amount).toBe(250);
    });
  });

  describe('PUT & DELETE /api/transactions/:id', () => {
    let transactionId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense',
          title: 'Local Supermarket Mart',
          amount: 800,
          category: 'Shopping'
        });
      transactionId = res.body.data._id;
    });

    it('should update transaction and learn category change in CategoryMemory', async () => {
      const updateRes = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: 'Food',
          amount: 850
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.category).toBe('Food');
      expect(updateRes.body.data.amount).toBe(850);
      expect(updateRes.body.data.categorySource).toBe('manual');

      // Check CategoryMemory was written
      const memory = await CategoryMemory.findOne({
        key: 'local supermarket mart'
      });
      expect(memory).not.toBeNull();
      expect(memory.category).toBe('Food');
      expect(memory.source).toBe('user');
      expect(memory.confidence).toBe(1.0);
    });

    it('should delete transaction successfully', async () => {
      const delRes = await request(app)
        .delete(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(404);
    });
  });
});

