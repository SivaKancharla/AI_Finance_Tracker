import { jest } from '@jest/globals';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import Transaction from '../src/models/Transaction.js';
import CategoryMemory from '../src/models/CategoryMemory.js';
import groqProvider from '../src/services/llm/providers/groq.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('CSV Import Endpoints (/api/transactions/import)', () => {
  let token;
  let sampleCsvBuffer;

  beforeAll(async () => {
    await connectTestDB();
    const sampleCsvPath = path.join(__dirname, '../eval/sample_statement.csv');
    sampleCsvBuffer = fs.readFileSync(sampleCsvPath);
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
      name: 'Import Test User',
      email: 'import.test@example.com',
      password: 'password123'
    });
    token = signupRes.body.token;
  });

  describe('POST /api/transactions/import/preview', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/transactions/import/preview')
        .attach('file', sampleCsvBuffer, 'statement.csv');

      expect(res.status).toBe(401);
    });

    it('should return 400 when no file is uploaded', async () => {
      const res = await request(app)
        .post('/api/transactions/import/preview')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/upload a csv/i);
    });

    it('should return 400 when uploading a non-CSV file', async () => {
      const fakePdf = Buffer.from('%PDF-1.4 Fake PDF content');
      const res = await request(app)
        .post('/api/transactions/import/preview')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', fakePdf, 'document.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only csv files/i);
    });

    it('should parse CSV, categorize rows via pipeline, and NOT save anything to DB', async () => {
      // Mock LLM categorization
      jest.spyOn(groqProvider, 'call').mockResolvedValue({
        text: JSON.stringify({
          results: [
            { id: '2', category: 'Food', merchant: 'Swiggy', confidence: 0.95 },
            { id: '3', category: 'Transport', merchant: 'Uber', confidence: 0.92 }
          ]
        })
      });

      const res = await request(app)
        .post('/api/transactions/import/preview')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', sampleCsvBuffer, 'statement.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(data.rows).toBeDefined();
      expect(data.summary).toBeDefined();

      // Sample statement has 41 total rows, 38 valid, 3 invalid
      expect(data.summary.total).toBe(41);
      expect(data.summary.valid).toBe(38);
      expect(data.summary.invalid).toBe(3);
      expect(data.summary.duplicates).toBe(0);

      // Verify zero transactions were created in MongoDB
      const countInDb = await Transaction.countDocuments();
      expect(countInDb).toBe(0);
    });

    it('should identify existing transactions as duplicates in preview', async () => {
      // First commit 2 transactions
      const initialCommitRes = await request(app)
        .post('/api/transactions/import/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rows: [
            {
              dateStr: '2026-10-02',
              title: 'UPI-SWIGGY-BANGALORE-ORDER-4521',
              amount: 420.0,
              type: 'expense',
              category: 'Food'
            },
            {
              dateStr: '2026-10-02',
              title: 'UBER INDIA TECH BANGALORE',
              amount: 350.0,
              type: 'expense',
              category: 'Transport'
            }
          ]
        });

      expect(initialCommitRes.status).toBe(200);
      expect(initialCommitRes.body.data.imported).toBe(2);

      // Now run preview with sample CSV
      const previewRes = await request(app)
        .post('/api/transactions/import/preview')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', sampleCsvBuffer, 'statement.csv');

      expect(previewRes.status).toBe(200);
      const { summary, rows } = previewRes.body.data;

      expect(summary.duplicates).toBe(2);
      const swiggyRow = rows.find((r) => r.title.includes('SWIGGY'));
      expect(swiggyRow.duplicate).toBe(true);
    });
  });

  describe('POST /api/transactions/import/commit', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/transactions/import/commit')
        .send({ rows: [] });

      expect(res.status).toBe(401);
    });

    it('should return 400 when rows array is empty', async () => {
      const res = await request(app)
        .post('/api/transactions/import/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({ rows: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should insert valid rows and yield 100% duplicates on re-commit', async () => {
      const rowsToCommit = [
        {
          dateStr: '2026-10-01',
          title: 'ACH SALARY TCS MUMBAI',
          amount: 85000,
          type: 'income',
          category: 'Salary',
          source: 'import'
        },
        {
          dateStr: '2026-10-02',
          title: 'UPI-SWIGGY-4521',
          amount: 420,
          type: 'expense',
          category: 'Food',
          source: 'llm'
        },
        // Two identical transactions on the same day (occurrenceIndex 0 and 1)
        {
          dateStr: '2026-10-05',
          title: 'Chai Point Tea',
          amount: 80,
          type: 'expense',
          category: 'Food',
          source: 'rule'
        },
        {
          dateStr: '2026-10-05',
          title: 'Chai Point Tea',
          amount: 80,
          type: 'expense',
          category: 'Food',
          source: 'rule'
        }
      ];

      // First commit: all 4 inserted
      const commitRes1 = await request(app)
        .post('/api/transactions/import/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({ rows: rowsToCommit });

      expect(commitRes1.status).toBe(200);
      expect(commitRes1.body.data.imported).toBe(4);
      expect(commitRes1.body.data.duplicates).toBe(0);

      const dbCount = await Transaction.countDocuments();
      expect(dbCount).toBe(4);

      // Second commit with identical data: 100% duplicates skipped
      const commitRes2 = await request(app)
        .post('/api/transactions/import/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({ rows: rowsToCommit });

      expect(commitRes2.status).toBe(200);
      expect(commitRes2.body.data.imported).toBe(0);
      expect(commitRes2.body.data.duplicates).toBe(4);
      expect(await Transaction.countDocuments()).toBe(4);
    });

    it('should learn user-edited categories to CategoryMemory with source: "user"', async () => {
      const rowsWithEdit = [
        {
          dateStr: '2026-10-15',
          title: 'Decathlon Sports Store',
          amount: 3200,
          type: 'expense',
          category: 'Shopping', // User adjusted to Shopping
          edited: true
        }
      ];

      const commitRes = await request(app)
        .post('/api/transactions/import/commit')
        .set('Authorization', `Bearer ${token}`)
        .send({ rows: rowsWithEdit });

      expect(commitRes.status).toBe(200);
      expect(commitRes.body.data.imported).toBe(1);

      // Verify transaction has categorySource: 'manual'
      const txn = await Transaction.findOne({ title: 'Decathlon Sports Store' });
      expect(txn).not.toBeNull();
      expect(txn.categorySource).toBe('manual');

      // Verify CategoryMemory was written with source: 'user'
      const memory = await CategoryMemory.findOne({ key: 'decathlon sports store' });
      expect(memory).not.toBeNull();
      expect(memory.category).toBe('Shopping');
      expect(memory.source).toBe('user');
      expect(memory.confidence).toBe(1.0);
    });
  });
});

