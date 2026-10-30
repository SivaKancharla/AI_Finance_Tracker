import mongoose from 'mongoose';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  ALL_CATEGORIES,
  PAYMENT_METHODS,
  CATEGORY_SOURCES
} from '../constants/categories.js';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Transaction type is required']
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      validate: {
        validator: function (val) {
          if (!ALL_CATEGORIES.includes(val)) return false;
          if (this.type === 'expense') {
            return EXPENSE_CATEGORIES.includes(val);
          }
          if (this.type === 'income') {
            return INCOME_CATEGORIES.includes(val);
          }
          return true;
        },
        message: (props) => `${props.value} is not a valid category for this transaction type`
      }
    },
    categorySource: {
      type: String,
      enum: CATEGORY_SOURCES,
      default: 'manual'
    },
    categoryConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null
    },
    needsReview: {
      type: Boolean,
      default: false
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'upi'
    },
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now
    },
    dedupeHash: {
      type: String,
      default: null
    },
    importBatchId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Indexes
transactionSchema.index({ userId: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, type: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index(
  { userId: 1, dedupeHash: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeHash: { $type: 'string' } }
  }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;

