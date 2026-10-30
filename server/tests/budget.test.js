import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';

describe('Budget Endpoints (/api/budget)', () => {
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
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Budget User',
      email: 'budget@example.com',
      password: 'password123'
    });
    token = res.body.token;
  });

  it('should return default empty budget when none has been set', async () => {
    const res = await request(app)
      .get('/api/budget')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.monthlyBudget).toBe(0);
    expect(res.body.data.categoryBudgets).toEqual([]);
  });

  it('should create and upsert budget with category limits', async () => {
    const budgetData = {
      monthlyBudget: 50000,
      categoryBudgets: [
        { category: 'Food', limit: 12000 },
        { category: 'Rent', limit: 20000 },
        { category: 'Transport', limit: 5000 }
      ]
    };

    const res = await request(app)
      .post('/api/budget')
      .set('Authorization', `Bearer ${token}`)
      .send(budgetData);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.monthlyBudget).toBe(50000);
    expect(res.body.data.categoryBudgets.length).toBe(3);
  });

  it('should reject budget with duplicate category entries', async () => {
    const duplicateData = {
      monthlyBudget: 30000,
      categoryBudgets: [
        { category: 'Food', limit: 10000 },
        { category: 'Food', limit: 5000 } // Duplicate
      ]
    };

    const res = await request(app)
      .post('/api/budget')
      .set('Authorization', `Bearer ${token}`)
      .send(duplicateData);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/validation/i);
  });

  it('should update existing budget via PUT /api/budget', async () => {
    await request(app)
      .post('/api/budget')
      .set('Authorization', `Bearer ${token}`)
      .send({
        monthlyBudget: 40000,
        categoryBudgets: [{ category: 'Food', limit: 10000 }]
      });

    const updateRes = await request(app)
      .put('/api/budget')
      .set('Authorization', `Bearer ${token}`)
      .send({
        monthlyBudget: 45000,
        categoryBudgets: [{ category: 'Food', limit: 12000 }]
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.monthlyBudget).toBe(45000);
    expect(updateRes.body.data.categoryBudgets[0].limit).toBe(12000);
  });
});

