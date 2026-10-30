const PREFIXES = new Set([
  'upi',
  'imps',
  'neft',
  'pos',
  'ach',
  'txn',
  'ref',
  'to',
  'from'
]);

export function normalizeMerchant(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // 1. Lowercase
  let cleaned = text.toLowerCase();

  // 2. Replace punctuation with space: * / - _ @ . , : ; # ! ? ( ) [ ] { } + = & ~ % < > |
  cleaned = cleaned.replace(/[*\/_@.,:;#!?()[\]{}\-+=&~%<>|]/g, ' ');

  // 3. Tokenize by whitespace
  const rawTokens = cleaned.split(/\s+/).filter(Boolean);

  // 4. Strip payment prefixes and pure numbers
  const filteredTokens = [];
  for (const token of rawTokens) {
    // If it's a known payment prefix, skip
    if (PREFIXES.has(token)) {
      continue;
    }
    // If it is entirely digits or hex/ref like digits, skip
    if (/^\d+$/.test(token)) {
      continue;
    }
    filteredTokens.push(token);
  }

  // 5. Keep first 3 tokens
  return filteredTokens.slice(0, 3).join(' ');
}

export default normalizeMerchant;

