import Budget from '../models/Budget.js';

export const getBudget = async (req, res) => {
  const budget = await Budget.findOne({ userId: req.userId });

  if (!budget) {
    return res.status(200).json({
      success: true,
      data: {
        monthlyBudget: 0,
        categoryBudgets: []
      }
    });
  }

  res.status(200).json({
    success: true,
    data: budget
  });
};

export const setBudget = async (req, res) => {
  const { monthlyBudget, categoryBudgets = [] } = req.body;

  const budget = await Budget.findOneAndUpdate(
    { userId: req.userId },
    {
      userId: req.userId,
      monthlyBudget,
      categoryBudgets
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    success: true,
    data: budget
  });
};

export const updateBudget = async (req, res) => {
  const { monthlyBudget, categoryBudgets } = req.body;

  const budget = await Budget.findOne({ userId: req.userId });
  if (!budget) {
    return res.status(404).json({
      success: false,
      message: 'No budget found for this user. Create one first.'
    });
  }

  if (monthlyBudget !== undefined) {
    budget.monthlyBudget = monthlyBudget;
  }
  if (categoryBudgets !== undefined) {
    budget.categoryBudgets = categoryBudgets;
  }

  await budget.save();

  res.status(200).json({
    success: true,
    data: budget
  });
};

