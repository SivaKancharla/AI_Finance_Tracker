import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import CategoryMemory from '../models/CategoryMemory.js';
import { categorizeSingle } from '../services/categorization/pipeline.js';
import { normalizeMerchant } from '../services/categorization/normalize.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories.js';

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export const createTransaction = async (req, res) => {
  const {
    type,
    title,
    description = '',
    amount,
    category,
    paymentMethod = 'upi',
    transactionDate
  } = req.body;

  let finalCategory = category;
  let categorySource = 'manual';
  let categoryConfidence = null;
  let needsReview = false;

  // Auto-categorize if category is omitted or 'auto'
  if (!finalCategory || finalCategory.trim().toLowerCase() === 'auto') {
    const aiResult = await categorizeSingle(req.userId, {
      title,
      description,
      amount,
      type
    });
    finalCategory = aiResult.category;
    categorySource = aiResult.source;
    categoryConfidence = aiResult.confidence;
    needsReview = aiResult.needsReview;
  } else {
    // Validate that provided category matches type
    const validList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!validList.includes(finalCategory)) {
      return res.status(400).json({
        success: false,
        message: `'${finalCategory}' is not a valid category for ${type}`
      });
    }
  }

  const transaction = await Transaction.create({
    userId: req.userId,
    type,
    title,
    description,
    amount,
    category: finalCategory,
    categorySource,
    categoryConfidence,
    needsReview,
    paymentMethod,
    transactionDate: transactionDate ? new Date(transactionDate) : new Date()
  });

  res.status(201).json({
    success: true,
    data: transaction
  });
};

export const getTransactions = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    type,
    search,
    from,
    to,
    sort = 'latest'
  } = req.query;

  // Always scope by userId
  const filter = { userId: req.userId };

  if (category) {
    filter.category = category;
  }

  if (type) {
    filter.type = type;
  }

  if (search && search.trim() !== '') {
    const escaped = escapeRegex(search.trim());
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } }
    ];
  }

  if (from || to) {
    filter.transactionDate = {};
    if (from) {
      filter.transactionDate.$gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      // If only date string YYYY-MM-DD was provided, include until end of day
      if (typeof to === 'string' && to.length === 10) {
        toDate.setUTCHours(23, 59, 59, 999);
      }
      filter.transactionDate.$lte = toDate;
    }
  }

  const sortOptions = {
    latest: { transactionDate: -1, _id: -1 },
    '-transactionDate': { transactionDate: -1, _id: -1 },
    oldest: { transactionDate: 1, _id: 1 },
    transactionDate: { transactionDate: 1, _id: 1 },
    amount_desc: { amount: -1, _id: -1 },
    '-amount': { amount: -1, _id: -1 },
    amount_asc: { amount: 1, _id: 1 },
    amount: { amount: 1, _id: 1 }
  };
  const selectedSort = sortOptions[sort] || sortOptions.latest;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort(selectedSort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Transaction.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1
    }
  });
};

export const getTransactionById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction ID'
    });
  }

  const transaction = await Transaction.findOne({ _id: id, userId: req.userId });
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  res.status(200).json({
    success: true,
    data: transaction
  });
};

export const updateTransaction = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction ID'
    });
  }

  const transaction = await Transaction.findOne({ _id: id, userId: req.userId });
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  const oldCategory = transaction.category;
  const updates = req.body;

  // If type is changing or category is changing, validate category against type
  const targetType = updates.type || transaction.type;
  if (updates.category) {
    const validList = targetType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!validList.includes(updates.category)) {
      return res.status(400).json({
        success: false,
        message: `'${updates.category}' is not a valid category for ${targetType}`
      });
    }
  }

  // If user changed category, record learning into CategoryMemory
  if (updates.category && updates.category !== oldCategory) {
    transaction.category = updates.category;
    transaction.categorySource = 'manual';
    transaction.needsReview = false;

    const fullTitle = `${updates.title || transaction.title} ${updates.description || transaction.description || ''}`;
    const key = normalizeMerchant(fullTitle);

    if (key) {
      await CategoryMemory.findOneAndUpdate(
        { userId: req.userId, key },
        {
          userId: req.userId,
          key,
          category: updates.category,
          confidence: 1.0,
          source: 'user',
          $inc: { hits: 1 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  // Update remaining fields
  if (updates.title !== undefined) transaction.title = updates.title;
  if (updates.description !== undefined) transaction.description = updates.description;
  if (updates.amount !== undefined) transaction.amount = updates.amount;
  if (updates.type !== undefined) transaction.type = updates.type;
  if (updates.paymentMethod !== undefined) transaction.paymentMethod = updates.paymentMethod;
  if (updates.transactionDate !== undefined) transaction.transactionDate = new Date(updates.transactionDate);
  if (updates.needsReview !== undefined && !updates.category) {
    transaction.needsReview = updates.needsReview;
  }

  await transaction.save();

  res.status(200).json({
    success: true,
    data: transaction
  });
};

export const deleteTransaction = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction ID'
    });
  }

  const transaction = await Transaction.findOneAndDelete({ _id: id, userId: req.userId });
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Transaction deleted successfully'
  });
};

