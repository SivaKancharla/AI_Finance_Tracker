import request from 'supertest';
import app from '../src/app.js';
import { validateEnv } from '../src/config/env.js';

describe('Health and Environment Validation', () => {
  describe('GET /health', () => {
    it('should return 200 and { status: "ok" }', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('Environment Validation', () => {
    it('should fail validation with clear message when JWT_SECRET is missing', () => {
      const invalidEnv = {
        PORT: '5000',
        NODE_ENV: 'test',
        MONGODB_URI: 'mongodb://localhost:27017/fintrack'
        // JWT_SECRET is missing
      };

      expect(() => validateEnv(invalidEnv)).toThrow(/JWT_SECRET is required/);
    });

    it('should fail validation when MONGODB_URI is missing', () => {
      const invalidEnv = {
        PORT: '5000',
        NODE_ENV: 'test',
        JWT_SECRET: 'supersecret'
        // MONGODB_URI is missing
      };

      expect(() => validateEnv(invalidEnv)).toThrow(/MONGODB_URI is required/);
    });

    it('should pass validation and apply defaults for valid minimal env', () => {
      const validEnv = {
        MONGODB_URI: 'mongodb://localhost:27017/fintrack',
        JWT_SECRET: 'supersecret'
      };

      const result = validateEnv(validEnv);
      expect(result.PORT).toBe(5000);
      expect(result.NODE_ENV).toBe('development');
      expect(result.JWT_SECRET).toBe('supersecret');
      expect(result.GEMINI_MODEL).toBe('gemini-2.5-flash');
      expect(result.GROQ_MODEL).toBe('llama-3.3-70b-versatile');
    });

    it('should clean placeholder or empty api keys to null', () => {
      const envWithPlaceholders = {
        MONGODB_URI: 'mongodb://localhost:27017/fintrack',
        JWT_SECRET: 'supersecret',
        GEMINI_API_KEY: 'your_key_here',
        GROQ_API_KEY: '   '
      };

      const result = validateEnv(envWithPlaceholders);
      expect(result.GEMINI_API_KEY).toBeNull();
      expect(result.GROQ_API_KEY).toBeNull();
    });
  });
});

