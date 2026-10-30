import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import Transaction from '../src/models/Transaction.js';
import Budget from '../src/models/Budget.js';

describe('User Data Isolation (Security)', () => {
  let tokenA;
  let tokenB;
  let userATxnId;

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
    // 1. Create User A
    const resA = await request(app).post('/api/auth/signup').send({
      name: 'User A',
      email: 'userA@example.com',
      password: 'password123'
    });
    tokenA = resA.body.token;

    // 2. Create User B
    const resB = await request(app).post('/api/auth/signup').send({
      name: 'User B',
      email: 'userB@example.com',
      password: 'password123'
    });
    tokenB = resB.body.token;

    // 3. User A creates a transaction
    const txnRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'expense',
        title: "User A's Private Secret Purchase",
        amount: 9999,
        category: 'Shopping'
      });
    userATxnId = txnRes.body.data._id;

    // 4. User A creates a budget
    await request(app)
      .post('/api/budget')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        monthlyBudget: 80000,
        categoryBudgets: [{ category: 'Shopping', limit: 20000 }]
      });
  });

  it('User B cannot list User A transactions in GET /api/transactions', async () => {
    const resB = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.data.length).toBe(0);
    expect(resB.body.pagination.total).toBe(0);
  });

  it("User B cannot get User A's transaction by ID (returns 404)", async () => {
    const resB = await request(app)
      .get(`/api/transactions/${userATxnId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(404);
    expect(resB.body.message).toMatch(/not found/i);
  });

  it("User B cannot update User A's transaction by ID (returns 404)", async () => {
    const resB = await request(app)
      .put(`/api/transactions/${userATxnId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        title: 'Hacked by User B',
        amount: 1
      });

    expect(resB.status).toBe(404);

    // Verify User A's transaction is unmodified in the database
    const txnInDb = await Transaction.findById(userATxnId);
    expect(txnInDb.title).toBe("User A's Private Secret Purchase");
    expect(txnInDb.amount).toBe(9999);
  });

  it("User B cannot delete User A's transaction by ID (returns 404)", async () => {
    const resB = await request(app)
      .delete(`/api/transactions/${userATxnId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(404);

    // Verify User A's transaction still exists in the database
    const txnInDb = await Transaction.findById(userATxnId);
    expect(txnInDb).not.toBeNull();
  });

  it("User B cannot read User A's budget", async () => {
    const resB = await request(app)
      .get('/api/budget')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    // User B should get empty default budget, not User A's 80,000 budget
    expect(resB.body.data.monthlyBudget).toBe(0);
    expect(resB.body.data.categoryBudgets).toEqual([]);
  });

  it("User B modifying their budget does not affect User A's budget", async () => {
    await request(app)
      .post('/api/budget')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        monthlyBudget: 25000,
        categoryBudgets: [{ category: 'Food', limit: 8000 }]
      });

    // Check User A's budget is intact
    const resA = await request(app)
      .get('/api/budget')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.data.monthlyBudget).toBe(80000);
    expect(resA.body.data.categoryBudgets[0].category).toBe('Shopping');
    expect(resA.body.data.categoryBudgets[0].limit).toBe(20000);
  });
});

