import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES } from '../constants/categories.js';

const categoryBudgetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: EXPENSE_CATEGORIES,
        message: '{VALUE} is not a valid expense category'
      }
    },
    limit: {
      type: Number,
      required: [true, 'Budget limit is required'],
      min: [0, 'Category budget limit must be 0 or greater']
    }
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    monthlyBudget: {
      type: Number,
      required: [true, 'Monthly budget is required'],
      min: [0, 'Monthly budget must be 0 or greater'],
      default: 0
    },
    categoryBudgets: {
      type: [categoryBudgetSchema],
      default: [],
      validate: {
        validator: function (items) {
          if (!items || items.length === 0) return true;
          const categories = items.map((i) => i.category);
          return new Set(categories).size === categories.length;
        },
        message: 'Duplicate categories are not allowed in categoryBudgets'
      }
    }
  },
  {
    timestamps: true
  }
);

export const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;

