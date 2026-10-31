import { jest } from '@jest/globals';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { generateStructured, LLMUnavailableError } from '../src/services/llm/index.js';
import { RateGate } from '../src/services/llm/rateGate.js';
import geminiProvider from '../src/services/llm/providers/gemini.js';
import groqProvider from '../src/services/llm/providers/groq.js';
import { CategorizeResultSchema, CategorizeJsonSchema } from '../src/services/llm/schemas.js';
import AiCallLog from '../src/models/AiCallLog.js';
import env from '../src/config/env.js';

describe('LLM Service Layer & Resilience', () => {
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

  describe('generateStructured with Mocked Providers', () => {
    it('should successfully parse and validate JSON from provider', async () => {
      const mockResult = {
        results: [{ id: '1', category: 'Food', merchant: 'Swiggy', confidence: 0.95 }]
      };

      // Mock groq (since env.GROQ_API_KEY is configured from user)
      jest.spyOn(groqProvider, 'call').mockResolvedValue({
        text: JSON.stringify(mockResult),
        usage: { prompt_tokens: 50, completion_tokens: 20 }
      });

      const res = await generateStructured({
        task: 'categorize',
        system: 'System prompt',
        prompt: 'User prompt',
        zodSchema: CategorizeResultSchema,
        jsonSchema: CategorizeJsonSchema
      });

      expect(res.data).toEqual(mockResult);
      expect(res.provider).toBeDefined();

      // Check AiCallLog was recorded and contains NO user text
      const logs = await AiCallLog.find();
      expect(logs.length).toBeGreaterThanOrEqual(1);
      const lastLog = logs[logs.length - 1];
      expect(lastLog.ok).toBe(true);
      expect(lastLog.task).toBe('categorize');
      // Verify no prompt or transaction text field exists in schema
      expect(lastLog.prompt).toBeUndefined();
      expect(lastLog.text).toBeUndefined();
    });

    it('should repair invalid JSON or schema violation via retry', async () => {
      const invalidJson = 'Not valid JSON at all';
      const validResult = {
        results: [{ id: '1', category: 'Transport', merchant: 'Uber', confidence: 0.9 }]
      };

      // First call fails with invalid JSON, second call (repair) succeeds
      jest.spyOn(groqProvider, 'call')
        .mockResolvedValueOnce({ text: invalidJson })
        .mockResolvedValueOnce({ text: JSON.stringify(validResult) });

      const res = await generateStructured({
        task: 'categorize',
        system: 'System prompt',
        prompt: 'User prompt',
        zodSchema: CategorizeResultSchema,
        jsonSchema: CategorizeJsonSchema
      });

      expect(res.data).toEqual(validResult);

      const logs = await AiCallLog.find();
      expect(logs.some((l) => l.errorType === 'invalid_json')).toBe(true);
      expect(logs.some((l) => l.ok === true && l.attempt === 2)).toBe(true);
    });

    it('should throw LLMUnavailableError when all providers fail', async () => {
      jest.spyOn(geminiProvider, 'call').mockRejectedValue(new Error('Gemini quota reached'));
      jest.spyOn(groqProvider, 'call').mockRejectedValue(new Error('Groq 500 server error'));

      await expect(
        generateStructured({
          task: 'categorize',
          system: 'System prompt',
          prompt: 'User prompt',
          zodSchema: CategorizeResultSchema,
          jsonSchema: CategorizeJsonSchema
        })
      ).rejects.toThrow(LLMUnavailableError);

      const logs = await AiCallLog.find();
      expect(logs.some((l) => l.ok === false)).toBe(true);
    });
  });

  describe('RateGate', () => {
    it('should queue and throttle calls when maxRpm is reached', async () => {
      const gate = new RateGate(2, 500); // 2 calls per minute, 500ms timeout
      process.env.FORCE_RATE_GATE = 'true';

      try {
        await gate.acquire(); // 1st: immediate
        await gate.acquire(); // 2nd: immediate

        // 3rd: should queue and fail on 500ms timeout
        await expect(gate.acquire()).rejects.toThrow(/timeout/i);
      } finally {
        gate.reset();
        delete process.env.FORCE_RATE_GATE;
      }
    });
  });
});
