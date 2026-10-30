import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  ALL_CATEGORIES,
  PAYMENT_METHODS,
  CATEGORY_SOURCES
} from '../constants/categories.js';

export const getMeta = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      expenseCategories: EXPENSE_CATEGORIES,
      incomeCategories: INCOME_CATEGORIES,
      allCategories: ALL_CATEGORIES,
      paymentMethods: PAYMENT_METHODS,
      categorySources: CATEGORY_SOURCES
    }
  });
};

