import env from '../../config/env.js';
import CategoryMemory from '../../models/CategoryMemory.js';
import { normalizeMerchant } from './normalize.js';
import { piiMask } from './piiMask.js';
import { ruleCategorize } from './ruleCategorizer.js';
import { generateStructured } from '../llm/index.js';
import {
  CATEGORIZATION_SYSTEM_PROMPT,
  buildCategorizePrompt
} from '../llm/prompts.js';
import {
  CategorizeResultSchema,
  CategorizeJsonSchema
} from '../llm/schemas.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories.js';

/**
 * Categorizes a batch of transactions using the full fallback chain:
 * CategoryMemory -> LLM (in chunks) -> Rule Categorizer -> Default 'Other'.
 * 
 * Never throws due to LLM failure; always returns results for every input item.
 * 
 * @param {string} userId 
 * @param {Array<{ id: string, type: 'income'|'expense', title: string, description?: string, amount: number }>} items 
 * @returns {Promise<Array<{ id: string, category: string, confidence: number, merchant: string|null, source: string, needsReview: boolean }>>}
 */
export async function categorizeTransactions(userId, items = []) {
  if (!items || items.length === 0) return [];

  const resultsMap = new Map();
  const unresolvedItems = [];

  // Step 1 & 2: Normalize, PII-mask & CategoryMemory lookup
  for (const item of items) {
    const rawText = `${item.title || ''} ${item.description || ''}`.trim();
    const key = normalizeMerchant(rawText);
    const safeText = piiMask(rawText);

    let memoryFound = false;
    if (userId && key) {
      try {
        const memory = await CategoryMemory.findOne({ userId, key });
        if (memory) {
          // Verify memory category is valid for transaction type
          const validList = item.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
          if (validList.includes(memory.category)) {
            // Increment hits (fire and forget)
            CategoryMemory.updateOne({ _id: memory._id }, { $inc: { hits: 1 } }).exec();

            resultsMap.set(String(item.id), {
              id: String(item.id),
              category: memory.category,
              confidence: memory.confidence,
              merchant: key,
              source: 'memory',
              needsReview: memory.confidence < env.CATEGORY_CONFIDENCE_MIN
            });
            memoryFound = true;
          }
        }
      } catch (err) { // eslint-disable-line no-unused-vars
        // Memory query failed; continue to LLM
      }
    }

    if (!memoryFound) {
      unresolvedItems.push({
        ...item,
        key,
        safeText
      });
    }
  }

  // Step 3: Call LLM for unresolved items in chunks of CATEGORIZE_BATCH_SIZE
  if (unresolvedItems.length > 0) {
    const batchSize = env.CATEGORIZE_BATCH_SIZE || 20;

    for (let i = 0; i < unresolvedItems.length; i += batchSize) {
      const chunk = unresolvedItems.slice(i, i + batchSize);

      try {
        const prompt = buildCategorizePrompt(chunk);
        const response = await generateStructured({
          task: 'categorize',
          system: CATEGORIZATION_SYSTEM_PROMPT,
          prompt,
          zodSchema: CategorizeResultSchema,
          jsonSchema: CategorizeJsonSchema,
          userId
        });

        const llmResults = response.data?.results || [];
        const llmResultMap = new Map(llmResults.map((r) => [String(r.id), r]));

        for (const item of chunk) {
          const llmRes = llmResultMap.get(String(item.id));
          if (llmRes && llmRes.category) {
            // Check that LLM category matches item type
            const validList = item.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
            if (validList.includes(llmRes.category)) {
              const conf = typeof llmRes.confidence === 'number' ? llmRes.confidence : 0.8;
              const merchant = llmRes.merchant || item.key || null;

              resultsMap.set(String(item.id), {
                id: String(item.id),
                category: llmRes.category,
                confidence: conf,
                merchant,
                source: 'llm',
                needsReview: conf < env.CATEGORY_CONFIDENCE_MIN
              });

              // Learn: save to CategoryMemory if confidence >= threshold and item has a key
              // Never overwrite a user-set entry
              if (userId && item.key && conf >= env.CATEGORY_CONFIDENCE_MIN) {
                try {
                  const existing = await CategoryMemory.findOne({ userId, key: item.key });
                  if (!existing) {
                    await CategoryMemory.create({
                      userId,
                      key: item.key,
                      category: llmRes.category,
                      confidence: conf,
                      source: 'llm',
                      hits: 1
                    });
                  } else if (existing.source !== 'user') {
                    existing.category = llmRes.category;
                    existing.confidence = conf;
                    existing.source = 'llm';
                    existing.hits = (existing.hits || 1) + 1;
                    await existing.save();
                  }
                } catch (memErr) { // eslint-disable-line no-unused-vars
                  // Non-fatal if memory learning fails
                }
              }
            }
          }
        }
      } catch (err) { // eslint-disable-line no-unused-vars
        // LLM failed for this chunk -> gracefully fall through to rules
      }
    }
  }

  // Step 4 & 5: Rules fallback and Default fallback
  const finalResults = [];
  for (const item of items) {
    const existing = resultsMap.get(String(item.id));
    if (existing) {
      finalResults.push(existing);
      continue;
    }

    // Try rule categorizer
    const rawText = `${item.title || ''} ${item.description || ''}`.trim();
    const key = normalizeMerchant(rawText);
    const ruleMatch = ruleCategorize(rawText, item.type);

    if (ruleMatch) {
      finalResults.push({
        id: String(item.id),
        category: ruleMatch.category,
        confidence: ruleMatch.confidence,
        merchant: key || null,
        source: 'rule',
        needsReview: ruleMatch.confidence < env.CATEGORY_CONFIDENCE_MIN
      });
    } else {
      // Default fallback
      finalResults.push({
        id: String(item.id),
        category: 'Other',
        confidence: 0,
        merchant: key || null,
        source: 'default',
        needsReview: true
      });
    }
  }

  return finalResults;
}

/**
 * Categorizes a single transaction. Convenience wrapper around categorizeTransactions.
 */
export async function categorizeSingle(userId, item) {
  const results = await categorizeTransactions(userId, [{ id: '0', ...item }]);
  return results[0];
}

export default {
  categorizeTransactions,
  categorizeSingle
};
