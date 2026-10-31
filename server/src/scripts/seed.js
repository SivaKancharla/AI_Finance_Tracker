import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import CategoryMemory from '../models/CategoryMemory.js';
import AiCallLog from '../models/AiCallLog.js';

export const DEMO_EMAIL = 'demo@fintrack.dev';
export const DEMO_PASSWORD = 'Demo@1234';

// Generate Date relative to today
function getDateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/**
 * Idempotently seeds demo data for demo@fintrack.dev
 */
export async function seedDemoData({
  isProduction = env.NODE_ENV === 'production',
  hasForceFlag = process.argv.includes('--force'),
  disconnect = false
} = {}) {
  if (isProduction && !hasForceFlag) {
    throw new Error('Seed script blocked in production environment. Pass --force to execute.');
  }

  // 1. Clean existing demo user and related data
  const existingUser = await User.findOne({ email: DEMO_EMAIL });
  if (existingUser) {
    const userId = existingUser._id;
    await Promise.all([
      Transaction.deleteMany({ userId }),
      Budget.deleteMany({ userId }),
      CategoryMemory.deleteMany({ userId }),
      AiCallLog.deleteMany({ userId }),
      User.deleteOne({ _id: userId })
    ]);
  }

  // 2. Create Demo User
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);

  const demoUser = await User.create({
    name: 'Siva Kumar',
    email: DEMO_EMAIL,
    password: hashedPassword
  });

  const userId = demoUser._id;

  // 3. Create 6 Months of Realistic Synthetic Transactions (~130 items)
  const transactions = [];

  // Monthly Recurring Templates (applied across past 5 completed months + current month)
  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    const baseDays = monthOffset * 30;

    // Monthly Salary (Income)
    transactions.push({
      userId,
      title: 'Tech Mahindra Monthly Salary Credit',
      amount: 85000,
      type: 'income',
      category: 'Salary',
      paymentMethod: 'bank_transfer',
      categorySource: 'manual',
      transactionDate: getDateOffset(baseDays + 28),
      confidence: 1.0,
      needsReview: false
    });

    // Monthly Rent
    transactions.push({
      userId,
      title: 'Monthly House Rent Transfer',
      amount: 22000,
      type: 'expense',
      category: 'Rent',
      paymentMethod: 'bank_transfer',
      categorySource: 'llm',
      transactionDate: getDateOffset(baseDays + 27),
      confidence: 0.95,
      needsReview: false
    });

    // Electricity Bill
    transactions.push({
      userId,
      title: 'BESCOM Electricity Bill Payment',
      amount: 1850 + (monthOffset * 45),
      type: 'expense',
      category: 'Bills',
      paymentMethod: 'upi',
      categorySource: 'rule',
      transactionDate: getDateOffset(baseDays + 20),
      confidence: 0.9,
      needsReview: false
    });

    // Broadband Internet
    transactions.push({
      userId,
      title: 'Airtel Xstream Fiber Bill',
      amount: 999,
      type: 'expense',
      category: 'Bills',
      paymentMethod: 'upi',
      categorySource: 'rule',
      transactionDate: getDateOffset(baseDays + 15),
      confidence: 0.95,
      needsReview: false
    });

    // Mobile Postpaid
    transactions.push({
      userId,
      title: 'Jio Postpaid Monthly Bill',
      amount: 499,
      type: 'expense',
      category: 'Bills',
      paymentMethod: 'upi',
      categorySource: 'rule',
      transactionDate: getDateOffset(baseDays + 12),
      confidence: 0.95,
      needsReview: false
    });

    // Streaming Subscriptions
    transactions.push({
      userId,
      title: 'Netflix Premium Monthly',
      amount: 649,
      type: 'expense',
      category: 'Entertainment',
      paymentMethod: 'card',
      categorySource: 'llm',
      transactionDate: getDateOffset(baseDays + 10),
      confidence: 0.92,
      needsReview: false
    });

    transactions.push({
      userId,
      title: 'Spotify India Subscription',
      amount: 119,
      type: 'expense',
      category: 'Entertainment',
      paymentMethod: 'card',
      categorySource: 'rule',
      transactionDate: getDateOffset(baseDays + 8),
      confidence: 0.95,
      needsReview: false
    });

    // Systematic Investment Plan (SIP)
    transactions.push({
      userId,
      title: 'Zerodha Mutual Fund SIP - Nifty 50 Index',
      amount: 15000,
      type: 'expense',
      category: 'Investments',
      paymentMethod: 'bank_transfer',
      categorySource: 'llm',
      transactionDate: getDateOffset(baseDays + 25),
      confidence: 0.95,
      needsReview: false
    });

    // Grocery deliveries (Blinkit / Zepto / Instamart)
    transactions.push({
      userId,
      title: 'Blinkit Instant Groceries & Essentials',
      amount: 1240 + (monthOffset * 30),
      type: 'expense',
      category: 'Food',
      paymentMethod: 'upi',
      categorySource: 'memory',
      transactionDate: getDateOffset(baseDays + 22),
      confidence: 1.0,
      needsReview: false
    });

    transactions.push({
      userId,
      title: 'Zepto Daily Milk and Fresh Bread',
      amount: 480,
      type: 'expense',
      category: 'Food',
      paymentMethod: 'upi',
      categorySource: 'rule',
      transactionDate: getDateOffset(baseDays + 18),
      confidence: 0.9,
      needsReview: false
    });

    transactions.push({
      userId,
      title: 'Swiggy Instamart Weekend Fruits & Veggies',
      amount: 890,
      type: 'expense',
      category: 'Food',
      paymentMethod: 'upi',
      categorySource: 'memory',
      transactionDate: getDateOffset(baseDays + 7),
      confidence: 1.0,
      needsReview: false
    });

    // Dining & Food Orders (Swiggy / Zomato)
    transactions.push({
      userId,
      title: 'Swiggy Order - Meghana Biryani Indiranagar',
      amount: 680,
      type: 'expense',
      category: 'Food',
      paymentMethod: 'upi',
      categorySource: 'memory',
      transactionDate: getDateOffset(baseDays + 24),
      confidence: 1.0,
      needsReview: false
    });

    transactions.push({
      userId,
      title: 'Zomato - Starbucks Coffee & Sandwiches',
      amount: 540,
      type: 'expense',
      category: 'Food',
      paymentMethod: 'card',
      categorySource: 'rule',
      transactionDate: getDateOffset(baseDays + 16),
      confidence: 0.9,
      needsReview: false
    });

    transactions.push({
      userId,
      title: 'Swiggy Dinner Delivery - Truffles Koramangala',
      amount: 720,
      type: 'expense',
      category: 'Food',
      paymentMethod: 'upi',
      categorySource: 'memory',
      transactionDate: getDateOffset(baseDays + 5),
      confidence: 1.0,
      needsReview: false
    });

    // Transport (Uber / Ola / Metro)
    transactions.push({
      userId,
      title: 'Uber Premier Ride to Tech Park Office',
      amount: 385,
      type: 'expense',
      category: 'Transport',
      paymentMethod: 'upi',
      categorySource: 'rule',
      transactionDate: getDateOffset(baseDays + 26),
      confidence: 0.92,
      needsReview: false
    });

    transactions.push({
      userId,
      title: 'Ola Cabs Airport Drop Kempegowda Intl',
      amount: 1120,
      type: 'expense',
      category: 'Transport',
      paymentMethod: 'upi',
      categorySource: 'rule',
      transactionDate: getDateOffset(baseDays + 14),
      confidence: 0.9,
      needsReview: false
    });

    transactions.push({
      userId,
      title: 'Namma Metro Card Recharge PayTM',
      amount: 500,
      type: 'expense',
      category: 'Transport',
      paymentMethod: 'upi',
      categorySource: 'llm',
      transactionDate: getDateOffset(baseDays + 2),
      confidence: 0.88,
      needsReview: false
    });

    // Shopping & E-Commerce
    transactions.push({
      userId,
      title: 'Amazon India Electronics - USB-C Hub & Cables',
      amount: 1890,
      type: 'expense',
      category: 'Shopping',
      paymentMethod: 'card',
      categorySource: 'rule',
      transactionDate: getDateOffset(baseDays + 21),
      confidence: 0.9,
      needsReview: false
    });

    // Healthcare & Pharmacy
    transactions.push({
      userId,
      title: 'Apollo Pharmacy Multivitamins and First Aid',
      amount: 740,
      type: 'expense',
      category: 'Healthcare',
      paymentMethod: 'upi',
      categorySource: 'rule',
      transactionDate: getDateOffset(baseDays + 11),
      confidence: 0.95,
      needsReview: false
    });
  }

  // Occasional / One-Off Realistic Transactions
  transactions.push(
    {
      userId,
      title: 'Upwork Global Freelance Web Dev Payout',
      amount: 32000,
      type: 'income',
      category: 'Freelance',
      paymentMethod: 'bank_transfer',
      categorySource: 'llm',
      transactionDate: getDateOffset(45),
      confidence: 0.95,
      needsReview: false
    },
    {
      userId,
      title: 'Fiverr Client Milestone Payment - UI Design',
      amount: 18500,
      type: 'income',
      category: 'Freelance',
      paymentMethod: 'bank_transfer',
      categorySource: 'llm',
      transactionDate: getDateOffset(110),
      confidence: 0.92,
      needsReview: false
    },
    {
      userId,
      title: 'Flipkart Big Billion Days - Noise ANC Headphones',
      amount: 4999,
      type: 'expense',
      category: 'Shopping',
      paymentMethod: 'card',
      categorySource: 'rule',
      transactionDate: getDateOffset(35),
      confidence: 0.9,
      needsReview: false
    },
    {
      userId,
      title: 'Coursera Annual Learning Subscription',
      amount: 3200,
      type: 'expense',
      category: 'Education',
      paymentMethod: 'card',
      categorySource: 'llm',
      transactionDate: getDateOffset(85),
      confidence: 0.92,
      needsReview: false
    },
    {
      userId,
      title: 'Cult.fit Fitness Club Annual Gym Membership',
      amount: 14500,
      type: 'expense',
      category: 'Healthcare',
      paymentMethod: 'card',
      categorySource: 'llm',
      transactionDate: getDateOffset(125),
      confidence: 0.88,
      needsReview: false
    },
    {
      userId,
      title: 'POS 9482 RESTAURANT INDIRANAGAR',
      amount: 1420,
      type: 'expense',
      category: 'Food',
      paymentMethod: 'card',
      categorySource: 'llm',
      transactionDate: getDateOffset(4),
      confidence: 0.65,
      needsReview: true
    },
    {
      userId,
      title: 'UPI Transfer to P. Sharma (Splitwise dinner)',
      amount: 650,
      type: 'expense',
      category: 'Other',
      paymentMethod: 'upi',
      categorySource: 'default',
      transactionDate: getDateOffset(1),
      confidence: 0.4,
      needsReview: true
    }
  );

  await Transaction.insertMany(transactions);

  // 4. Create Monthly Budget for the current month
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const budget = await Budget.create({
    userId,
    monthlyBudget: 60000,
    categoryBudgets: [
      { category: 'Food', limit: 10000 },
      { category: 'Rent', limit: 25000 },
      { category: 'Transport', limit: 5000 },
      { category: 'Bills', limit: 6000 },
      { category: 'Entertainment', limit: 4000 },
      { category: 'Shopping', limit: 8000 },
      { category: 'Healthcare', limit: 5000 }
    ]
  });

  // 5. Seed CategoryMemory for Active Learning demonstration
  const memories = [
    {
      userId,
      key: 'blinkit',
      category: 'Food',
      confidence: 1.0,
      source: 'user',
      hits: 14
    },
    {
      userId,
      key: 'swiggy instamart',
      category: 'Food',
      confidence: 1.0,
      source: 'user',
      hits: 9
    },
    {
      userId,
      key: 'swiggy',
      category: 'Food',
      confidence: 1.0,
      source: 'user',
      hits: 18
    },
    {
      userId,
      key: 'cultfit',
      category: 'Healthcare',
      confidence: 1.0,
      source: 'user',
      hits: 4
    }
  ];

  await CategoryMemory.insertMany(memories);

  // 6. Seed Sample AI Observability Logs (AiCallLog)
  const logs = [
    {
      userId,
      task: 'categorize',
      provider: 'groq',
      model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
      inputChars: 380,
      outputChars: 120,
      latencyMs: 385,
      ok: true,
      attempt: 1,
      fallbackUsed: false,
      promptVersion: 'v1',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      userId,
      task: 'categorize',
      provider: 'gemini',
      model: env.GEMINI_MODEL || 'gemini-2.5-flash',
      inputChars: 410,
      outputChars: 110,
      latencyMs: 640,
      ok: true,
      attempt: 1,
      fallbackUsed: false,
      promptVersion: 'v1',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      userId,
      task: 'budget_optimize',
      provider: 'groq',
      model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
      inputChars: 520,
      outputChars: 240,
      latencyMs: 780,
      ok: true,
      attempt: 1,
      fallbackUsed: false,
      promptVersion: 'v1',
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    },
    {
      userId,
      task: 'insights',
      provider: 'groq',
      model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
      inputChars: 460,
      outputChars: 190,
      latencyMs: 510,
      ok: true,
      attempt: 1,
      fallbackUsed: false,
      promptVersion: 'v1',
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
    }
  ];

  await AiCallLog.insertMany(logs);

  if (disconnect) {
    await mongoose.disconnect();
  }

  return {
    demoUser,
    transactionsCount: transactions.length,
    budget,
    memoriesCount: memories.length,
    logsCount: logs.length
  };
}

// Auto-run if executed directly
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMain) {
  console.log('='.repeat(65));
  console.log(' FinTrack Demo Data Seed Script');
  console.log('='.repeat(65));

  connectDB()
    .then(async () => {
      console.log('Connected to MongoDB. Seeding demo data...');
      const summary = await seedDemoData({ disconnect: true });
      console.log('\n' + '='.repeat(65));
      console.log(' SEED COMPLETED SUCCESSFULLY!');
      console.log(` Demo Account:        ${DEMO_EMAIL}`);
      console.log(` Password:            ${DEMO_PASSWORD}`);
      console.log(` Seeded Transactions: ${summary.transactionsCount}`);
      console.log(` Active Memories:     ${summary.memoriesCount}`);
      console.log(` Telemetry Logs:      ${summary.logsCount}`);
      console.log('='.repeat(65) + '\n');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal seed script error:', err.message);
      process.exit(1);
    });
}
