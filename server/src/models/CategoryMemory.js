import mongoose from 'mongoose';
import { ALL_CATEGORIES } from '../constants/categories.js';

const categoryMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    key: {
      type: String,
      required: [true, 'Merchant key is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ALL_CATEGORIES,
        message: '{VALUE} is not a valid category'
      }
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1.0
    },
    source: {
      type: String,
      enum: ['user', 'llm'],
      default: 'user'
    },
    hits: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: true }
  }
);

categoryMemorySchema.index({ userId: 1, key: 1 }, { unique: true });

export const CategoryMemory = mongoose.model('CategoryMemory', categoryMemorySchema);
export default CategoryMemory;

