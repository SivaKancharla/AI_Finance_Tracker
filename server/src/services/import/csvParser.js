import { parse } from 'csv-parse/sync';
import { parseTransactionDate } from './dateParse.js';
import {
  ALL_CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS
} from '../../constants/categories.js';

/**
 * Cleans monetary string into a valid number.
 * Strips ₹, Rs., INR, spaces, and commas.
 * 
 * @param {string|number} raw 
 * @returns {number|null}
 */
export function cleanAmount(raw) {
  if (typeof raw === 'number') {
    return isNaN(raw) ? null : raw;
  }
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  // Remove currency prefixes/symbols, commas, and whitespace
  const cleaned = raw
    .replace(/[₹\$\€\£]/g, '')
    .replace(/(?:^|[^\w])(?:rs\.?|inr)\s*/gi, ' ')
    .replace(/,/g, '')
    .trim();

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Finds the canonical column name from possible synonyms.
 * 
 * @param {string[]} headers 
 * @param {string[]} synonyms 
 * @returns {string|null}
 */
function findHeader(headers, synonyms) {
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: h.trim().toLowerCase().replace(/[^a-z0-9]/g, ' ')
  }));

  for (const synonym of synonyms) {
    const normSyn = synonym.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const match = normalizedHeaders.find(
      (h) => h.normalized === normSyn || h.normalized.includes(normSyn)
    );
    if (match) {
      return match.original;
    }
  }
  return null;
}

/**
 * Normalizes payment method string against canonical list.
 */
function normalizePaymentMethod(val) {
  if (!val || typeof val !== 'string') return 'other';
  const clean = val.trim().toLowerCase();
  if (PAYMENT_METHODS.includes(clean)) return clean;
  if (clean.includes('upi')) return 'upi';
  if (clean.includes('card') || clean.includes('pos')) return 'card';
  if (clean.includes('net') || clean.includes('neft') || clean.includes('imps') || clean.includes('rtgs')) return 'netbanking';
  if (clean.includes('cash')) return 'cash';
  return 'other';
}

/**
 * Parses raw CSV string or buffer into structured transaction candidates.
 * 
 * @param {string|Buffer} csvContent 
 * @returns {{
 *   headers: string[],
 *   validRows: Array<Object>,
 *   invalidRows: Array<Object>,
 *   totalRows: number
 * }}
 */
export function parseCsv(csvContent) {
  if (!csvContent) {
    throw new Error('CSV content is empty or missing');
  }

  let rawRecords;
  try {
    rawRecords = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true
    });
  } catch (err) {
    throw new Error(`CSV parsing failed: ${err.message}`);
  }

  if (!rawRecords || rawRecords.length === 0) {
    return {
      headers: [],
      validRows: [],
      invalidRows: [],
      totalRows: 0
    };
  }

  const sampleRow = rawRecords[0];
  const headers = Object.keys(sampleRow);

  // Map headers to fields
  const dateCol = findHeader(headers, ['date', 'transaction date', 'txn date', 'value date', 'posting date']);
  const titleCol = findHeader(headers, ['description', 'narration', 'particulars', 'title', 'details', 'remarks']);
  const amountCol = findHeader(headers, ['amount', 'txn amount', 'transaction amount', 'net amount']);
  const debitCol = findHeader(headers, ['debit', 'withdrawal', 'debit amount', 'dr amount', 'withdrawal amt']);
  const creditCol = findHeader(headers, ['credit', 'deposit', 'credit amount', 'cr amount', 'deposit amt']);
  const typeCol = findHeader(headers, ['type', 'transaction type', 'txn type', 'cr/dr', 'dr/cr']);
  const categoryCol = findHeader(headers, ['category', 'expense category']);
  const paymentMethodCol = findHeader(headers, ['payment method', 'mode', 'channel', 'payment mode']);

  const validRows = [];
  const invalidRows = [];

  rawRecords.forEach((record, index) => {
    const rowNumber = index + 2; // 1-based, row 1 is header
    const errors = [];

    // 1. Title / Narration
    let title = (titleCol && record[titleCol] ? record[titleCol] : '').trim();
    if (!title) {
      errors.push('Missing transaction description or title');
    }

    // 2. Date
    let dateObj = null;
    let dateStr = null;
    const rawDate = dateCol && record[dateCol] ? record[dateCol] : null;
    if (rawDate) {
      const parsedDate = parseTransactionDate(rawDate);
      if (parsedDate) {
        dateObj = parsedDate.date;
        dateStr = parsedDate.dateStr;
      } else {
        errors.push(`Invalid date format: "${rawDate}"`);
      }
    } else {
      errors.push('Missing transaction date');
    }

    // 3. Amount & Type
    let amount = null;
    let type = 'expense';

    const rawDebit = debitCol ? cleanAmount(record[debitCol]) : null;
    const rawCredit = creditCol ? cleanAmount(record[creditCol]) : null;

    if (rawDebit !== null && rawDebit > 0) {
      amount = Math.abs(rawDebit);
      type = 'expense';
    } else if (rawCredit !== null && rawCredit > 0) {
      amount = Math.abs(rawCredit);
      type = 'income';
    } else if (amountCol && record[amountCol] !== undefined && record[amountCol] !== '') {
      const rawAmt = cleanAmount(record[amountCol]);
      if (rawAmt !== null && rawAmt !== 0) {
        amount = Math.abs(rawAmt);
        if (rawAmt < 0) {
          type = 'expense';
        } else {
          // Check if explicit type column says otherwise
          const rawType = (typeCol && record[typeCol] ? record[typeCol] : '').toLowerCase();
          if (rawType.includes('cr') || rawType.includes('income') || rawType.includes('credit')) {
            type = 'income';
          } else {
            type = 'expense';
          }
        }
      } else {
        errors.push('Amount cannot be zero or invalid');
      }
    } else {
      errors.push('Missing transaction amount, debit, or credit');
    }

    // Check explicit type column if present and not already determined by debit/credit
    if (typeCol && record[typeCol] && (rawDebit === null && rawCredit === null)) {
      const explicitType = record[typeCol].trim().toLowerCase();
      if (explicitType === 'income' || explicitType === 'credit' || explicitType === 'cr') {
        type = 'income';
      } else if (explicitType === 'expense' || explicitType === 'debit' || explicitType === 'dr') {
        type = 'expense';
      }
    }

    // 4. Category
    let category = null;
    let source = null;
    let confidence = null;

    if (categoryCol && record[categoryCol]) {
      const candidateCat = record[categoryCol].trim();
      const validList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      const matched = validList.find((c) => c.toLowerCase() === candidateCat.toLowerCase());
      if (matched) {
        category = matched;
        source = 'import';
        confidence = 1.0;
      }
    }

    // 5. Payment Method
    const paymentMethod = paymentMethodCol && record[paymentMethodCol]
      ? normalizePaymentMethod(record[paymentMethodCol])
      : 'other';

    if (errors.length === 0 && amount !== null && amount > 0 && dateObj && title) {
      validRows.push({
        rowNumber,
        date: dateObj,
        dateStr,
        title,
        description: '',
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        type,
        category,
        source,
        confidence,
        paymentMethod,
        errors: []
      });
    } else {
      invalidRows.push({
        rowNumber,
        raw: record,
        errors
      });
    }
  });

  return {
    headers,
    validRows,
    invalidRows,
    totalRows: rawRecords.length
  };
}

export default parseCsv;
