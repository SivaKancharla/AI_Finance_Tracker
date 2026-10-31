import mongoose from 'mongoose';
import env from '../../config/env.js';
import AiCallLog from '../../models/AiCallLog.js';
import { rateGate } from './rateGate.js';
import { PROMPT_VERSION } from './prompts.js';
import geminiProvider from './providers/gemini.js';
import groqProvider from './providers/groq.js';

export class LLMUnavailableError extends Error {
  constructor(message = 'All configured LLM providers failed or are unavailable.') {
    super(message);
    this.name = 'LLMUnavailableError';
    this.isLLMUnavailable = true;
  }
}

const PROVIDERS = {
  gemini: {
    call: (...args) => geminiProvider.call(...args),
    model: () => env.GEMINI_MODEL,
    hasKey: () => Boolean(env.GEMINI_API_KEY)
  },
  groq: {
    call: (...args) => groqProvider.call(...args),
    model: () => env.GROQ_MODEL,
    hasKey: () => Boolean(env.GROQ_API_KEY)
  }
};

/**
 * Strips markdown code fences (```json ... ```) defensively from LLM output.
 */
function cleanJsonOutput(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Writes an AiCallLog entry (safely caught so it never crashes user requests).
 */
async function logAiCall(data) {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) return;
  } catch (_) { return; }
  try {
    await AiCallLog.create({
      userId: (mongoose.Types && mongoose.Types.ObjectId.isValid(data.userId)) ? data.userId : null,
      task: data.task,
      provider: data.provider,
      model: data.model,
      ok: Boolean(data.ok),
      latencyMs: Math.max(0, Math.round(data.latencyMs || 0)),
      attempt: data.attempt || 1,
      inputChars: data.inputChars || 0,
      outputChars: data.outputChars || 0,
      errorType: data.errorType || null,
      fallbackUsed: Boolean(data.fallbackUsed),
      promptVersion: PROMPT_VERSION
    });
  } catch (err) {
    if (env.NODE_ENV === 'development') {
      console.warn('AiCallLog write failed:', err.message);
    }
  }
}

/**
 * Invokes the multi-provider LLM chain with rate gating, timeouts, retries, and schema repair.
 * 
 * @param {Object} params
 * @param {'categorize' | 'budget_optimize' | 'insights'} params.task
 * @param {string} params.system
 * @param {string} params.prompt
 * @param {import('zod').ZodSchema} params.zodSchema
 * @param {Object} params.jsonSchema
 * @param {string} [params.userId]
 * @param {number} [params.temperature=0]
 * @returns {Promise<{ data: any, provider: string, model: string, latencyMs: number }>}
 */
export async function generateStructured({
  task,
  system,
  prompt,
  zodSchema,
  jsonSchema,
  userId = null,
  temperature = 0
}) {
  const providerOrder = (env.LLM_PROVIDER_ORDER || 'gemini,groq')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  let lastError = null;

  for (const providerName of providerOrder) {
    const provider = PROVIDERS[providerName];
    if (!provider) continue;

    // Check key availability
    if (!provider.hasKey()) {
      logAiCall({
        userId,
        task,
        provider: providerName,
        model: provider.model(),
        ok: false,
        latencyMs: 0,
        attempt: 1,
        inputChars: (system?.length || 0) + (prompt?.length || 0),
        outputChars: 0,
        errorType: 'no_key',
        fallbackUsed: false
      });
      continue;
    }

    const modelName = provider.model();
    const maxRetries = env.LLM_MAX_RETRIES || 1;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const startTime = Date.now();
      let inputChars = (system?.length || 0) + (prompt?.length || 0);

      try {
        // 1. Enter client-side rate gate
        await rateGate.acquire();

        // 2. Setup timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), env.LLM_TIMEOUT_MS || 15000);

        let providerRes;
        try {
          providerRes = await provider.call({
            system,
            prompt,
            jsonSchema,
            temperature,
            signal: controller.signal
          });
        } finally {
          clearTimeout(timeoutId);
        }

        const latencyMs = Date.now() - startTime;
        const rawText = providerRes.text || '';
        const outputChars = rawText.length;

        // 3. Parse JSON
        let parsed;
        try {
          parsed = JSON.parse(cleanJsonOutput(rawText));
        } catch (jsonErr) { // eslint-disable-line no-unused-vars
          // JSON parse failed -> log and attempt repair
          await logAiCall({
            userId,
            task,
            provider: providerName,
            model: modelName,
            ok: false,
            latencyMs,
            attempt,
            inputChars,
            outputChars,
            errorType: 'invalid_json',
            fallbackUsed: false
          });

          // Attempt repair once
          const repaired = await attemptRepair({
            provider,
            providerName,
            modelName,
            system,
            prompt,
            jsonSchema,
            zodSchema,
            userId,
            task,
            repairNote: 'Output was not valid JSON. Return strictly raw JSON matching the schema.',
            temperature
          });

          if (repaired) return repaired;
          throw new Error('LLM output invalid JSON and repair failed');
        }

        // 4. Validate with Zod
        const validation = zodSchema.safeParse(parsed);
        if (validation.success) {
          // Success! Log and return
          await logAiCall({
            userId,
            task,
            provider: providerName,
            model: modelName,
            ok: true,
            latencyMs,
            attempt,
            inputChars,
            outputChars,
            errorType: null,
            fallbackUsed: false
          });

          return {
            data: validation.data,
            provider: providerName,
            model: modelName,
            latencyMs
          };
        } else {
          // Schema failed -> log and attempt repair with Zod issue paths
          const issuePaths = validation.error.issues.map((i) => i.path.join('.')).join(', ');
          await logAiCall({
            userId,
            task,
            provider: providerName,
            model: modelName,
            ok: false,
            latencyMs,
            attempt,
            inputChars,
            outputChars,
            errorType: 'schema',
            fallbackUsed: false
          });

          const repaired = await attemptRepair({
            provider,
            providerName,
            modelName,
            system,
            prompt,
            jsonSchema,
            zodSchema,
            userId,
            task,
            repairNote: `Output failed schema validation at paths: [${issuePaths}]. Correct and return valid JSON only.`,
            temperature
          });

          if (repaired) return repaired;
          throw new Error(`Schema validation failed at paths: ${issuePaths}`);
        }
      } catch (err) {
        lastError = err;
        const latencyMs = Date.now() - startTime;
        const errorType = err.errorType || (err.name === 'AbortError' ? 'timeout' : 'other');

        await logAiCall({
          userId,
          task,
          provider: providerName,
          model: modelName,
          ok: false,
          latencyMs,
          attempt,
          inputChars,
          outputChars: 0,
          errorType,
          fallbackUsed: false
        });

        // If rate limited or 5xx and attempts remain, back off with jitter
        if (attempt <= maxRetries && (errorType === 'rate_limit' || errorType === 'http')) {
          const jitter = Math.random() * 200;
          const backoff = Math.pow(2, attempt) * 500 + jitter;
          await new Promise((r) => setTimeout(r, backoff));
        } else {
          // Move to next provider
          break;
        }
      }
    }
  }

  // All providers failed
  throw new LLMUnavailableError(lastError ? lastError.message : 'All LLM providers unavailable');
}

/**
 * One repair retry attempt sending feedback to the provider.
 */
async function attemptRepair({
  provider,
  providerName,
  modelName,
  system,
  prompt,
  jsonSchema,
  zodSchema,
  userId,
  task,
  repairNote,
  temperature
}) {
  const repairPrompt = `${prompt}\n\n[FEEDBACK: ${repairNote}]`;
  const startTime = Date.now();
  const inputChars = (system?.length || 0) + repairPrompt.length;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.LLM_TIMEOUT_MS || 15000);

    let res;
    try {
      res = await provider.call({
        system,
        prompt: repairPrompt,
        jsonSchema,
        temperature,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const latencyMs = Date.now() - startTime;
    const rawText = res.text || '';
    const parsed = JSON.parse(cleanJsonOutput(rawText));
    const validation = zodSchema.safeParse(parsed);

    if (validation.success) {
      await logAiCall({
        userId,
        task,
        provider: providerName,
        model: modelName,
        ok: true,
        latencyMs,
        attempt: 2,
        inputChars,
        outputChars: rawText.length,
        errorType: null,
        fallbackUsed: false
      });

      return {
        data: validation.data,
        provider: providerName,
        model: modelName,
        latencyMs
      };
    }
  } catch (err) { // eslint-disable-line no-unused-vars
    // Repair failed; return null to trigger next provider
    return null;
  }
  return null;
}

export default {
  LLMUnavailableError,
  generateStructured
};
