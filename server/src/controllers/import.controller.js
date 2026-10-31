import env from '../config/env.js';
import Transaction from '../models/Transaction.js';
import CategoryMemory from '../models/CategoryMemory.js';
import { parseCsv } from '../services/import/csvParser.js';
import { parseTransactionDate } from '../services/import/dateParse.js';
import { assignDedupeHashes } from '../services/import/dedupe.js';
import { categorizeTransactions } from '../services/categorization/pipeline.js';
import { normalizeMerchant } from '../services/categorization/normalize.js';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES
} from '../constants/categories.js';

/**
 * Previews CSV statement import without saving anything to the database.
 * 
 * POST /api/transactions/import/preview (multipart)
 */
export const previewImport = async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a CSV file'
    });
  }

  // 1. Parse CSV buffer
  let parsed;
  try {
    parsed = parseCsv(req.file.buffer);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to parse CSV file'
    });
  }

  // 2. Enforce row limit
  if (parsed.totalRows > env.IMPORT_MAX_ROWS) {
    return res.status(400).json({
      success: false,
      message: `CSV exceeds maximum allowed rows (${env.IMPORT_MAX_ROWS})`
    });
  }

  if (parsed.totalRows === 0) {
    return res.status(200).json({
      success: true,
      data: {
        rows: [],
        summary: {
          total: 0,
          valid: 0,
          invalid: 0,
          duplicates: 0,
          needsReview: 0,
          bySource: { memory: 0, llm: 0, rule: 0, default: 0, import: 0 }
        }
      }
    });
  }

  // 3. Assign occurrence-indexed deduplication hashes
  const hashedValidRows = assignDedupeHashes(req.userId, parsed.validRows);

  // 4. Batch query existing dedupe hashes in MongoDB
  const allHashes = hashedValidRows.map((r) => r.dedupeHash).filter(Boolean);
  const existingTransactions = await Transaction.find(
    {
      userId: req.userId,
      dedupeHash: { $in: allHashes }
    },
    { dedupeHash: 1 }
  ).lean();

  const existingHashSet = new Set(existingTransactions.map((t) => t.dedupeHash));

  // 5. Flag duplicates and identify rows needing AI categorization
  const itemsToCategorize = [];
  const processedRows = [];

  for (const row of hashedValidRows) {
    const isDuplicate = existingHashSet.has(row.dedupeHash);

    const baseRow = {
      ...row,
      duplicate: isDuplicate,
      needsReview: false
    };

    if (isDuplicate) {
      // Duplicates don't need AI categorization
      baseRow.category = baseRow.category || 'Other';
      baseRow.source = baseRow.source || 'default';
      baseRow.confidence = baseRow.confidence || 0;
      processedRows.push(baseRow);
    } else if (row.category && row.source === 'import') {
      // CSV provided its own valid category
      baseRow.needsReview = false;
      processedRows.push(baseRow);
    } else {
      // Needs categorization through our resilient pipeline
      itemsToCategorize.push({
        id: String(row.rowNumber),
        title: row.title,
        description: row.description || '',
        amount: row.amount,
        type: row.type
      });
      processedRows.push(baseRow);
    }
  }

  // 6. Run pipeline on uncategorized, non-duplicate rows
  if (itemsToCategorize.length > 0) {
    try {
      const catResults = await categorizeTransactions(req.userId, itemsToCategorize);
      const catResultMap = new Map(catResults.map((r) => [String(r.id), r]));

      for (const row of processedRows) {
        if (!row.duplicate && row.source !== 'import') {
          const resObj = catResultMap.get(String(row.rowNumber));
          if (resObj) {
            row.category = resObj.category;
            row.confidence = resObj.confidence;
            row.source = resObj.source;
            row.needsReview = resObj.needsReview;
          } else {
            row.category = 'Other';
            row.source = 'default';
            row.confidence = 0;
            row.needsReview = true;
          }
        }
      }
    } catch (catErr) { // eslint-disable-line no-unused-vars
      // If entire categorization fails, mark remaining as Other + needsReview
      for (const row of processedRows) {
        if (!row.duplicate && row.source !== 'import' && !row.category) {
          row.category = 'Other';
          row.source = 'default';
          row.confidence = 0;
          row.needsReview = true;
        }
      }
    }
  }

  // 7. Format invalid rows
  const formattedInvalidRows = parsed.invalidRows.map((inv) => ({
    rowNumber: inv.rowNumber,
    date: null,
    dateStr: null,
    title: inv.raw.description || inv.raw.narration || inv.raw.title || 'Unknown',
    description: '',
    amount: 0,
    type: 'expense',
    category: null,
    confidence: null,
    source: null,
    needsReview: true,
    duplicate: false,
    errors: inv.errors
  }));

  // Combine rows sorted by rowNumber
  const allResultRows = [...processedRows, ...formattedInvalidRows].sort(
    (a, b) => a.rowNumber - b.rowNumber
  );

  // 8. Compute summary
  const bySource = {
    memory: 0,
    llm: 0,
    rule: 0,
    default: 0,
    import: 0
  };

  let duplicateCount = 0;
  let needsReviewCount = 0;

  for (const row of processedRows) {
    if (row.duplicate) {
      duplicateCount += 1;
    } else {
      if (row.needsReview) {
        needsReviewCount += 1;
      }
      if (row.source && bySource[row.source] !== undefined) {
        bySource[row.source] += 1;
      }
    }
  }

  res.status(200).json({
    success: true,
    data: {
      rows: allResultRows,
      summary: {
        total: parsed.totalRows,
        valid: parsed.validRows.length,
        invalid: parsed.invalidRows.length,
        duplicates: duplicateCount,
        needsReview: needsReviewCount,
        bySource
      }
    }
  });
};

/**
 * Commits reviewed CSV transactions to the database with deduplication and active learning.
 * 
 * POST /api/transactions/import/commit
 */
export const commitImport = async (req, res) => {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No transaction rows provided to commit'
    });
  }

  if (rows.length > env.IMPORT_MAX_ROWS) {
    return res.status(400).json({
      success: false,
      message: `Cannot commit more than ${env.IMPORT_MAX_ROWS} rows at once`
    });
  }

  const batchId = `import-${Date.now()}`;

  // 1. Prepare valid candidate objects with normalized dates
  const candidates = [];
  const failedRows = [];

  rows.forEach((row, idx) => {
    // Validate date
    let dateObj = null;
    let dateStr = row.dateStr;

    if (row.date) {
      if (row.date instanceof Date && !isNaN(row.date.getTime())) {
        dateObj = row.date;
      } else if (typeof row.date === 'string') {
        const parsed = parseTransactionDate(row.date);
        if (parsed) {
          dateObj = parsed.date;
          dateStr = parsed.dateStr;
        }
      }
    }

    if (!dateObj && dateStr) {
      const parsed = parseTransactionDate(dateStr);
      if (parsed) {
        dateObj = parsed.date;
        dateStr = parsed.dateStr;
      }
    }

    const title = (row.title || '').trim();
    const amount = Number(row.amount);
    const type = row.type === 'income' ? 'income' : 'expense';

    if (!dateObj || !title || isNaN(amount) || amount <= 0) {
      failedRows.push({
        row: idx + 1,
        title: title || 'Unknown',
        reason: 'Invalid date, empty title, or non-positive amount'
      });
      return;
    }

    // Validate category against transaction type
    const validCategoryList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    let category = row.category;
    if (!category || !validCategoryList.includes(category)) {
      category = 'Other';
    }

    candidates.push({
      ...row,
      date: dateObj,
      dateStr,
      title,
      amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      type,
      category,
      paymentMethod: row.paymentMethod || 'other'
    });
  });

  if (candidates.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'All submitted rows were invalid',
      data: {
        imported: 0,
        duplicates: 0,
        failed: failedRows.length,
        failedRows
      }
    });
  }

  // 2. Server-side dedupe hash computation (never trust client hashes)
  const hashedCandidates = assignDedupeHashes(req.userId, candidates);

  // 3. Check for existing dedupe hashes in database
  const allHashes = hashedCandidates.map((c) => c.dedupeHash).filter(Boolean);
  const existingDocs = await Transaction.find(
    {
      userId: req.userId,
      dedupeHash: { $in: allHashes }
    },
    { dedupeHash: 1 }
  ).lean();

  const existingHashSet = new Set(existingDocs.map((d) => d.dedupeHash));

  const docsToInsert = [];
  let duplicatesSkipped = 0;
  const userEditedRows = [];

  for (const item of hashedCandidates) {
    if (existingHashSet.has(item.dedupeHash)) {
      duplicatesSkipped += 1;
      continue;
    }

    // Determine categorySource
    let categorySource = 'import';
    if (item.edited) {
      categorySource = 'manual';
      userEditedRows.push(item);
    } else if (item.source) {
      categorySource = item.source;
    }

    docsToInsert.push({
      userId: req.userId,
      transactionDate: item.date,
      title: item.title,
      description: item.description || '',
      amount: item.amount,
      type: item.type,
      category: item.category,
      categorySource,
      categoryConfidence: typeof item.confidence === 'number' ? item.confidence : null,
      needsReview: Boolean(item.needsReview),
      paymentMethod: item.paymentMethod,
      dedupeHash: item.dedupeHash,
      importBatchId: batchId
    });
  }

  // 4. Insert non-duplicate rows using insertMany with ordered: false
  let importedCount = 0;

  if (docsToInsert.length > 0) {
    try {
      const inserted = await Transaction.insertMany(docsToInsert, { ordered: false });
      importedCount = inserted.length;
    } catch (insertErr) {
      if (insertErr.writeErrors && insertErr.writeErrors.length > 0) {
        for (const writeErr of insertErr.writeErrors) {
          if (writeErr.code === 11000) {
            // Duplicate key race condition caught by MongoDB partial unique index
            duplicatesSkipped += 1;
          } else {
            failedRows.push({
              reason: writeErr.errmsg || 'Database write error'
            });
          }
        }
        importedCount = docsToInsert.length - insertErr.writeErrors.length;
      } else {
        throw insertErr;
      }
    }
  }

  // 5. Active learning: save CategoryMemory for user-edited rows (source: 'user')
  if (userEditedRows.length > 0) {
    for (const edited of userEditedRows) {
      const key = normalizeMerchant(edited.title);
      if (key) {
        try {
          await CategoryMemory.findOneAndUpdate(
            { userId: req.userId, key },
            {
              userId: req.userId,
              key,
              category: edited.category,
              confidence: 1.0,
              source: 'user',
              $inc: { hits: 1 }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (memErr) { // eslint-disable-line no-unused-vars
          // Non-fatal if memory update fails
        }
      }
    }
  }

  res.status(200).json({
    success: true,
    data: {
      imported: importedCount,
      duplicates: duplicatesSkipped,
      failed: failedRows.length,
      failedRows,
      batchId
    }
  });
};

export default {
  previewImport,
  commitImport
};

