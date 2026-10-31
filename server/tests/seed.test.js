import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import User from '../src/models/User.js';
import Transaction from '../src/models/Transaction.js';
import Budget from '../src/models/Budget.js';
import CategoryMemory from '../src/models/CategoryMemory.js';
import AiCallLog from '../src/models/AiCallLog.js';
import { seedDemoData, DEMO_EMAIL, DEMO_PASSWORD } from '../src/scripts/seed.js';

jest.setTimeout(30000);

describe('Demo Data Seeding (Phase P7)', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it('seeds demo user and rich historical data cleanly', async () => {
    const result = await seedDemoData({ isProduction: false, hasForceFlag: false, disconnect: false });

    expect(result.demoUser).toBeDefined();
    expect(result.demoUser.email).toBe(DEMO_EMAIL);
    expect(result.transactionsCount).toBeGreaterThanOrEqual(120);
    expect(result.memoriesCount).toBe(4);
    expect(result.logsCount).toBe(4);

    const user = await User.findOne({ email: DEMO_EMAIL });
    expect(user).toBeTruthy();
    expect(user.name).toBe('Siva Kumar');

    const txCount = await Transaction.countDocuments({ userId: user._id });
    expect(txCount).toBe(result.transactionsCount);

    const budget = await Budget.findOne({ userId: user._id });
    expect(budget).toBeTruthy();
    expect(budget.monthlyBudget).toBe(60000);
    expect(budget.categoryBudgets.length).toBeGreaterThanOrEqual(5);

    const memCount = await CategoryMemory.countDocuments({ userId: user._id });
    expect(memCount).toBe(4);

    const logCount = await AiCallLog.countDocuments({ userId: user._id });
    expect(logCount).toBe(4);
  });

  it('is completely idempotent on subsequent runs', async () => {
    // Run second time
    const secondResult = await seedDemoData({ isProduction: false, hasForceFlag: false, disconnect: false });

    const user = await User.findOne({ email: DEMO_EMAIL });
    const userCount = await User.countDocuments({ email: DEMO_EMAIL });
    expect(userCount).toBe(1);

    const txCount = await Transaction.countDocuments({ userId: user._id });
    expect(txCount).toBe(secondResult.transactionsCount);

    const budgetCount = await Budget.countDocuments({ userId: user._id });
    expect(budgetCount).toBe(1);
  });

  it('blocks seeding in production when --force flag is absent', async () => {
    await expect(
      seedDemoData({ isProduction: true, hasForceFlag: false, disconnect: false })
    ).rejects.toThrow('Seed script blocked in production environment');
  });

  it('allows seeding in production when --force flag is passed', async () => {
    const result = await seedDemoData({ isProduction: true, hasForceFlag: true, disconnect: false });
    expect(result.demoUser).toBeDefined();
  });
});
