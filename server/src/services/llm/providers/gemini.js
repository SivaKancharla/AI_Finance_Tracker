import { GoogleGenAI } from '@google/genai';
import env from '../../../config/env.js';

/**
 * Calls Google Gemini API with schema-constrained JSON output.
 * 
 * @param {Object} params
 * @param {string} params.system System instruction
 * @param {string} params.prompt User prompt
 * @param {Object} params.jsonSchema JSON Schema specification
 * @param {number} [params.temperature=0]
 * @param {AbortSignal} [params.signal] AbortController signal
 * @returns {Promise<{ text: string, usage?: Object }>}
 */
export async function call({ system, prompt, jsonSchema, temperature = 0, signal }) {
  if (!env.GEMINI_API_KEY) {
    const error = new Error('Gemini API key is not configured');
    error.errorType = 'no_key';
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  // Clean jsonSchema if needed (strip keywords that some Gemini endpoints reject)
  const cleanSchema = { ...jsonSchema };
  delete cleanSchema.$schema;
  delete cleanSchema.definitions;

  const generatePromise = ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      temperature,
      responseMimeType: 'application/json',
      responseJsonSchema: cleanSchema
    }
  });

  let response;
  if (signal) {
    const abortPromise = new Promise((_, reject) => {
      if (signal.aborted) {
        const err = new Error('Gemini request aborted');
        err.errorType = 'timeout';
        return reject(err);
      }
      signal.addEventListener(
        'abort',
        () => {
          const err = new Error('Gemini request timed out');
          err.errorType = 'timeout';
          reject(err);
        },
        { once: true }
      );
    });

    response = await Promise.race([generatePromise, abortPromise]);
  } else {
    response = await generatePromise;
  }

  return {
    text: response.text || '',
    usage: response.usageMetadata || null
  };
}

export default {
  call
};
