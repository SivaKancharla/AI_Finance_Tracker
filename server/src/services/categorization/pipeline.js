import CategoryMemory from '../../models/CategoryMemory.js';
import { normalizeMerchant } from './normalize.js';
import { ruleCategorize } from './ruleCategorizer.js';
import env from '../../config/env.js';

export async function categorizeSingle(userId, { title, description = '', amount, type = 'expense' }) {
  const fullText = `${title || ''} ${description || ''}`.trim();
  const key = normalizeMerchant(fullText);

  // 1. Check CategoryMemory
  if (userId && key) {
    try {
      const memory = await CategoryMemory.findOne({ userId, key });
      if (memory) {
        // Increment hits async (fire and forget)
        CategoryMemory.updateOne({ _id: memory._id }, { $inc: { hits: 1 } }).exec();
        return {
          category: memory.category,
          confidence: memory.confidence,
          merchant: key,
          source: 'memory',
          needsReview: memory.confidence < env.CATEGORY_CONFIDENCE_MIN
        };
      }
    } catch (err) { // eslint-disable-line no-unused-vars
      // ignore memory error and continue
    }
  }

  // 2. Rule Categorizer fallback
  const ruleMatch = ruleCategorize(fullText, type);
  if (ruleMatch) {
    return {
      category: ruleMatch.category,
      confidence: ruleMatch.confidence,
      merchant: key || null,
      source: 'rule',
      needsReview: ruleMatch.confidence < env.CATEGORY_CONFIDENCE_MIN
    };
  }

  // 3. Default fallback
  return {
    category: 'Other',
    confidence: 0,
    merchant: key || null,
    source: 'default',
    needsReview: true
  };
}

export default {
  categorizeSingle
};

