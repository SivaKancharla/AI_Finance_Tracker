import crypto from 'crypto';
import { normalizeMerchant } from '../categorization/normalize.js';

/**
 * Computes a deterministic SHA-1 deduplication hash for a single transaction.
 * 
 * Formula:
 * sha1(userId | YYYY-MM-DD | amount.toFixed(2) | type | normalizedTitle | occurrenceIndex)
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.dateStr YYYY-MM-DD
 * @param {number} params.amount
 * @param {'income' | 'expense'} params.type
 * @param {string} params.title
 * @param {number} [params.occurrenceIndex=0]
 * @returns {string}
 */
export function computeDedupeHash({
  userId,
  dateStr,
  amount,
  type,
  title,
  occurrenceIndex = 0
}) {
  const normTitle = normalizeMerchant(title || '') || (title || '').trim().toLowerCase();
  const amtStr = Number(amount || 0).toFixed(2);
  const rawKey = `${String(userId)}|${dateStr}|${amtStr}|${type}|${normTitle}|${occurrenceIndex}`;
  return crypto.createHash('sha1').update(rawKey).digest('hex');
}

/**
 * Processes an array of parsed rows and assigns occurrence-indexed dedupe hashes.
 * Tracks identical (dateStr, amount, type, normalizedTitle) tuples within the batch
 * so that genuine identical transactions on the same day receive unique occurrence indexes,
 * while re-importing the same statement yields identical dedupe hashes.
 * 
 * @param {string} userId
 * @param {Array<Object>} rows
 * @returns {Array<Object>} rows augmented with dedupeHash and occurrenceIndex
 */
export function assignDedupeHashes(userId, rows = []) {
  const occurrenceTracker = new Map();

  return rows.map((row) => {
    // If the row is invalid or missing critical fields, skip hash computation
    if (!row.dateStr || typeof row.amount !== 'number' || !row.type) {
      return {
        ...row,
        dedupeHash: null,
        occurrenceIndex: 0
      };
    }

    const normTitle = normalizeMerchant(row.title || '') || (row.title || '').trim().toLowerCase();
    const amtStr = Number(row.amount).toFixed(2);
    const signature = `${row.dateStr}|${amtStr}|${row.type}|${normTitle}`;

    const currentCount = occurrenceTracker.get(signature) || 0;
    occurrenceTracker.set(signature, currentCount + 1);

    const hash = computeDedupeHash({
      userId,
      dateStr: row.dateStr,
      amount: row.amount,
      type: row.type,
      title: row.title,
      occurrenceIndex: currentCount
    });

    return {
      ...row,
      dedupeHash: hash,
      occurrenceIndex: currentCount
    };
  });
}

export default {
  computeDedupeHash,
  assignDedupeHashes
};
