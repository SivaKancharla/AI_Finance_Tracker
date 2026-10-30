export const EXPENSE_CATEGORIES = [
  'Food',
  'Rent',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills',
  'Healthcare',
  'Education',
  'Investments',
  'Other'
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Other'
];

export const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'bank_transfer',
  'upi',
  'wallet',
  'other'
];

export const CATEGORY_SOURCES = [
  'manual',
  'memory',
  'llm',
  'rule',
  'default',
  'import'
];

