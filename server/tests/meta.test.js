import request from 'supertest';
import app from '../src/app.js';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS
} from '../src/constants/categories.js';

describe('GET /api/meta', () => {
  it('should return canonical lists for categories and payment methods', async () => {
    const res = await request(app).get('/api/meta');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expenseCategories).toEqual(EXPENSE_CATEGORIES);
    expect(res.body.data.incomeCategories).toEqual(INCOME_CATEGORIES);
    expect(res.body.data.paymentMethods).toEqual(PAYMENT_METHODS);
  });
});

