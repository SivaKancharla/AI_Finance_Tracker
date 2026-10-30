import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env if present
dotenv.config();

const cleanApiKey = (val) => {
  if (!val) return null;
  const trimmed = val.trim();
  if (
    trimmed === '' ||
    trimmed.toLowerCase() === 'your_key_here' ||
    trimmed.toLowerCase() === 'change_me' ||
    trimmed.toLowerCase() === 'placeholder'
  ) {
    return null;
  }
  return trimmed;
};

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  MONGODB_URI: z.string({
    required_error: 'MONGODB_URI is required'
  }).min(1, 'MONGODB_URI is required'),

  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required'
  }).min(1, 'JWT_SECRET is required'),
  JWT_EXPIRE: z.string().default('7d'),

  LLM_PROVIDER_ORDER: z.string().default('gemini,groq'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  LLM_MAX_RPM: z.coerce.number().int().positive().default(10),
  LLM_MAX_RETRIES: z.coerce.number().int().nonnegative().default(1),

  GEMINI_API_KEY: z.string().optional().nullable().transform(cleanApiKey),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

  GROQ_API_KEY: z.string().optional().nullable().transform(cleanApiKey),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_JSON_MODE: z.enum(['json_object', 'json_schema']).default('json_object'),

  CATEGORIZE_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  CATEGORY_CONFIDENCE_MIN: z.coerce.number().min(0).max(1).default(0.6),
  IMPORT_MAX_ROWS: z.coerce.number().int().positive().default(500),
  IMPORT_MAX_BYTES: z.coerce.number().int().positive().default(1048576)
});

export function validateEnv(source = process.env) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    const message = `Environment configuration validation failed:\n${formattedErrors}`;
    throw new Error(message);
  }

  return Object.freeze(result.data);
}

// In test environment, if MONGODB_URI or JWT_SECRET are not set in process.env, provide safe test defaults
const envSource = { ...process.env };
if (process.env.NODE_ENV === 'test') {
  if (!envSource.MONGODB_URI) {
    envSource.MONGODB_URI = 'mongodb://localhost:27017/fintrack_test';
  }
  if (!envSource.JWT_SECRET) {
    envSource.JWT_SECRET = 'test_jwt_secret_key_1234567890';
  }
}

export const env = validateEnv(envSource);
export default env;

