const EXPENSE_RULES = [
  {
    category: 'Food',
    keywords: [
      'swiggy', 'zomato', 'dominos', 'mcdonald', 'kfc', 'cafe', 'restaurant',
      'biryani', 'grocery', 'bigbasket', 'blinkit', 'zepto', 'starbucks', 'diner'
    ]
  },
  {
    category: 'Transport',
    keywords: [
      'uber', 'ola', 'rapido', 'irctc', 'metro', 'petrol', 'fuel', 'fastag',
      'redbus', 'railway', 'flight', 'diesel'
    ]
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'mall', 'clothing',
      'store', 'fashion', 'retail', 'supermarket'
    ]
  },
  {
    category: 'Entertainment',
    keywords: [
      'netflix', 'spotify', 'hotstar', 'bookmyshow', 'prime video',
      'youtube premium', 'cinema', 'theatre', 'gaming', 'steam'
    ]
  },
  {
    category: 'Bills',
    keywords: [
      'airtel', 'jio', 'vi', 'electricity', 'bescom', 'water bill',
      'broadband', 'recharge', 'gas', 'utility', 'piped gas', 'dth'
    ]
  },
  {
    category: 'Healthcare',
    keywords: [
      'apollo', 'pharmacy', 'medplus', 'hospital', 'clinic', 'diagnostic',
      'medicine', 'doctor', 'lab', 'dentist'
    ]
  },
  {
    category: 'Rent',
    keywords: ['rent', 'landlord', 'pg', 'house rent', 'flat maintenance']
  },
  {
    category: 'Education',
    keywords: [
      'udemy', 'coursera', 'tuition', 'college fee', 'exam fee', 'books',
      'school fee', 'course', 'training'
    ]
  },
  {
    category: 'Investments',
    keywords: ['sip', 'zerodha', 'groww', 'mutual fund', 'stocks', 'indmoney']
  }
];

const INCOME_RULES = [
  {
    category: 'Salary',
    keywords: ['salary', 'payroll', 'wages', 'stipend', 'employer', 'tcs', 'infosys']
  },
  {
    category: 'Freelance',
    keywords: ['freelance', 'upwork', 'fiverr', 'contract', 'client payment', 'consulting']
  },
  {
    category: 'Investments',
    keywords: ['dividend', 'interest', 'capital gain', 'zerodha payout', 'groww payout']
  }
];

export function ruleCategorize(text, type = 'expense') {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const normalized = text.toLowerCase();
  const ruleSet = type === 'income' ? INCOME_RULES : EXPENSE_RULES;

  for (const rule of ruleSet) {
    for (const kw of rule.keywords) {
      // Check for whole word or boundary match
      const regex = new RegExp(`(^|\\W)${kw}(\\W|$)`, 'i');
      if (regex.test(normalized)) {
        return {
          category: rule.category,
          confidence: 0.70
        };
      }
    }
  }

  // Fallback partial substring match (weak)
  for (const rule of ruleSet) {
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        return {
          category: rule.category,
          confidence: 0.55
        };
      }
    }
  }

  return null;
}

export default ruleCategorize;

