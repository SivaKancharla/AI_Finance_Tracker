import { jest } from '@jest/globals';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { categorizeTransactions, categorizeSingle } from '../src/services/categorization/pipeline.js';
import CategoryMemory from '../src/models/CategoryMemory.js';
import groqProvider from '../src/services/llm/providers/groq.js';
import geminiProvider from '../src/services/llm/providers/gemini.js';
import mongoose from 'mongoose';

describe('Categorization Pipeline Fallback Chain', () => {
  const userId = new mongoose.Types.ObjectId().toString();

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

  it('Step 1: Should resolve from CategoryMemory first without calling LLM', async () => {
    // Pre-populate memory
    await CategoryMemory.create({
      userId,
      key: 'my favorite cafe',
      category: 'Food',
      confidence: 1.0,
      source: 'user'
    });

    const llmSpy = jest.spyOn(groqProvider, 'call');

    const results = await categorizeTransactions(userId, [
      { id: '1', type: 'expense', title: 'My Favorite Cafe', amount: 350 }
    ]);

    expect(results.length).toBe(1);
    expect(results[0].category).toBe('Food');
    expect(results[0].source).toBe('memory');
    expect(results[0].confidence).toBe(1.0);
    expect(results[0].needsReview).toBe(false);
    expect(llmSpy).not.toHaveBeenCalled();
  });

  it('Step 2: Should call LLM for unresolved items and learn to CategoryMemory', async () => {
    const mockLlmResponse = {
      results: [
        { id: 'item1', category: 'Shopping', merchant: 'Unique Boutique', confidence: 0.92 }
      ]
    };

    jest.spyOn(groqProvider, 'call').mockResolvedValue({
      text: JSON.stringify(mockLlmResponse)
    });

    const results = await categorizeTransactions(userId, [
      { id: 'item1', type: 'expense', title: 'Unique Boutique Dress', amount: 2500 }
    ]);

    expect(results[0].category).toBe('Shopping');
    expect(results[0].source).toBe('llm');
    expect(results[0].confidence).toBe(0.92);

    // Verify learned entry in CategoryMemory
    const memory = await CategoryMemory.findOne({ userId, key: 'unique boutique dress' });
    expect(memory).not.toBeNull();
    expect(memory.category).toBe('Shopping');
    expect(memory.source).toBe('llm');
  });

  it('Step 3: Should NEVER overwrite source: "user" in CategoryMemory with source: "llm"', async () => {
    // User explicitly defined this merchant as 'Other'
    await CategoryMemory.create({
      userId,
      key: 'uber rides',
      category: 'Other',
      confidence: 1.0,
      source: 'user'
    });

    // LLM suggests 'Transport'
    jest.spyOn(groqProvider, 'call').mockResolvedValue({
      text: JSON.stringify({
        results: [{ id: '1', category: 'Transport', merchant: 'Uber', confidence: 0.95 }]
      })
    });

    await categorizeTransactions(userId, [
      { id: '1', type: 'expense', title: 'Uber Rides City', amount: 200 }
    ]);

    // Memory must still have source 'user' and category 'Other'
    const memory = await CategoryMemory.findOne({ userId, key: 'uber rides' });
    expect(memory.category).toBe('Other');
    expect(memory.source).toBe('user');
  });

  it('Step 4: Should fallback to ruleCategorizer when LLM is unavailable', async () => {
    // Both providers throw
    jest.spyOn(geminiProvider, 'call').mockRejectedValue(new Error('Quota'));
    jest.spyOn(groqProvider, 'call').mockRejectedValue(new Error('Network error'));

    // 'Swiggy' has a keyword rule in Food
    const results = await categorizeTransactions(userId, [
      { id: '1', type: 'expense', title: 'Swiggy Biryani Delivery', amount: 450 }
    ]);

    expect(results[0].category).toBe('Food');
    expect(results[0].source).toBe('rule');
    expect(results[0].confidence).toBe(0.7);
  });

  it('Step 5: Should fallback to default "Other" with needsReview: true when all fail', async () => {
    jest.spyOn(geminiProvider, 'call').mockRejectedValue(new Error('Down'));
    jest.spyOn(groqProvider, 'call').mockRejectedValue(new Error('Down'));

    // Mystery text with no keyword match
    const results = await categorizeTransactions(userId, [
      { id: '1', type: 'expense', title: 'X9Z Mystery Vendor 4488', amount: 100 }
    ]);

    expect(results[0].category).toBe('Other');
    expect(results[0].source).toBe('default');
    expect(results[0].confidence).toBe(0);
    expect(results[0].needsReview).toBe(true);
  });

  it('Step 6: categorizeSingle convenience wrapper works cleanly', async () => {
    const res = await categorizeSingle(userId, {
      title: 'Dominos Pizza Order',
      amount: 600,
      type: 'expense'
    });

    expect(res.category).toBe('Food');
    expect(['rule', 'llm', 'memory']).toContain(res.source);
  });
});
