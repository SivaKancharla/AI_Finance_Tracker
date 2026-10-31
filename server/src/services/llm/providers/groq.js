import env from '../../../config/env.js';

/**
 * Calls Groq OpenAI-compatible endpoint using native fetch.
 * 
 * @param {Object} params
 * @param {string} params.system System instruction
 * @param {string} params.prompt User prompt
 * @param {Object} params.jsonSchema JSON Schema specification
 * @param {number} [params.temperature=0]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ text: string, usage?: Object }>}
 */
export async function call({ system, prompt, jsonSchema, temperature = 0, signal }) {
  if (!env.GROQ_API_KEY) {
    const error = new Error('Groq API key is not configured');
    error.errorType = 'no_key';
    throw error;
  }

  const responseFormat =
    env.GROQ_JSON_MODE === 'json_schema'
      ? {
          type: 'json_schema',
          json_schema: { name: 'result', strict: true, schema: jsonSchema }
        }
      : { type: 'json_object' };

  let res;
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        response_format: responseFormat
      }),
      signal
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Groq request timed out');
      timeoutErr.errorType = 'timeout';
      throw timeoutErr;
    }
    const netErr = new Error(`Groq network failure: ${err.message}`);
    netErr.errorType = 'http';
    throw netErr;
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const err = new Error(`Groq HTTP ${res.status}: ${errBody}`);
    if (res.status === 429) {
      err.errorType = 'rate_limit';
    } else if (res.status >= 500) {
      err.errorType = 'http';
    } else {
      err.errorType = 'other';
    }
    throw err;
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';

  return {
    text,
    usage: data?.usage || null
  };
}

export default {
  call
};
