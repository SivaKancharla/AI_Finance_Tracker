import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBudget, saveBudget } from '../redux/slices/budgetSlice.js';
import { addToast } from '../redux/slices/uiSlice.js';
import aiService from '../services/aiService.js';
import dashboardService from '../services/dashboardService.js';
import CategoryBudgetRow from '../components/budget/CategoryBudgetRow.jsx';
import AiBudgetSuggestion from '../components/budget/AiBudgetSuggestion.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { Sparkles, Plus, Save } from 'lucide-react';

export function Budget() {
  const dispatch = useDispatch();
  const expenseCategories = useSelector((state) => state.meta.expenseCategories);
  const { monthlyBudget: savedBudget, categoryBudgets: savedLimits, loading: budgetLoading } = useSelector(
    (state) => state.budget
  );

  // Form State
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState([]);
  const [currentSpendMap, setCurrentSpendMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // AI Suggestion State
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Sync initial budget from Redux store
  useEffect(() => {
    dispatch(fetchBudget());
    // Also fetch current month spend
    dashboardService
      .getDashboardSummary()
      .then((res) => {
        if (res.data?.summary?.categoryBreakdown) {
          const map = {};
          res.data.summary.categoryBreakdown.forEach((c) => {
            map[c.category] = c.amount;
          });
          setCurrentSpendMap(map);
        }
      })
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    setMonthlyBudget(savedBudget ? String(savedBudget) : '');
    setCategoryBudgets(savedLimits || []);
  }, [savedBudget, savedLimits]);

  // Categories currently unused in categoryBudgets list
  const usedCategories = new Set(categoryBudgets.map((b) => b.category));
  const availableCategoriesToAdd = expenseCategories.filter((c) => !usedCategories.has(c));

  const handleAddCategoryRow = () => {
    if (availableCategoriesToAdd.length === 0) return;
    setCategoryBudgets((prev) => [
      ...prev,
      { category: availableCategoriesToAdd[0], limit: '' }
    ]);
  };

  const handleCategoryRowChange = (index, field, value) => {
    setCategoryBudgets((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveCategoryRow = (index) => {
    setCategoryBudgets((prev) => prev.filter((_, idx) => idx !== index));
  };

  // AI Budget Suggestion Trigger
  const handleSuggestBudget = async () => {
    setAiLoading(true);
    setError(null);
    try {
      const res = await aiService.optimizeBudget();
      setAiData(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to generate budget optimization recommendations.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Apply AI Suggestion to Form (Fills inputs; does NOT save until user clicks Save)
  const handleApplySuggestion = (suggestion) => {
    if (!suggestion) return;

    if (suggestion.suggestedMonthlyBudget) {
      setMonthlyBudget(String(suggestion.suggestedMonthlyBudget));
    }

    if (Array.isArray(suggestion.categoryLimits)) {
      setCategoryBudgets(
        suggestion.categoryLimits.map((c) => ({
          category: c.category,
          limit: String(c.suggestedLimit)
        }))
      );
    }

    setAiData(null);
    dispatch(
      addToast({
        type: 'info',
        message: 'AI recommendations applied to form. Click "Save Budget" to confirm changes.'
      })
    );
  };

  // Save to Database
  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    const budgetNum = Number(monthlyBudget);
    if (!monthlyBudget || budgetNum <= 0) {
      setError('Please provide a valid monthly budget amount greater than 0.');
      return;
    }

    // Filter and sanitize category limits
    const validCategoryBudgets = categoryBudgets
      .filter((b) => b.category && Number(b.limit) > 0)
      .map((b) => ({
        category: b.category,
        limit: Number(b.limit)
      }));

    // Check for duplicate categories
    const seen = new Set();
    for (const b of validCategoryBudgets) {
      if (seen.has(b.category)) {
        setError(`Duplicate budget limit found for category: ${b.category}`);
        return;
      }
      seen.add(b.category);
    }

    setSaving(true);
    try {
      await dispatch(
        saveBudget({
          monthlyBudget: budgetNum,
          categoryBudgets: validCategoryBudgets
        })
      ).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: 'Monthly budget preferences saved successfully!'
        })
      );
    } catch (err) {
      setError(String(err) || 'Failed to save budget preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Budget Planner</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure monthly spending ceilings and category targets with AI assistance
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={handleSuggestBudget}
          loading={aiLoading}
          icon={Sparkles}
          className="border border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100"
        >
          AI Suggest Budget
        </Button>
      </div>

      <ErrorBanner message={error} />

      {/* AI Suggestion Panel (when triggered) */}
      {aiData && (
        <AiBudgetSuggestion
          suggestionData={aiData}
          onApply={handleApplySuggestion}
          onDismiss={() => setAiData(null)}
        />
      )}

      {/* Main Budget Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="max-w-xs">
            <Input
              label="Overall Monthly Spending Budget (₹)"
              name="monthlyBudget"
              type="number"
              min="1"
              step="500"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              placeholder="e.g. 50000"
              helperText="Target maximum expenses per calendar month"
              required
            />
          </div>
        </div>

        {/* Category Limits Section */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Category Spending Limits</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set individual monthly allowances for essential and discretionary categories
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCategoryRow}
              disabled={availableCategoriesToAdd.length === 0}
              icon={Plus}
            >
              Add Category Limit
            </Button>
          </div>

          <div className="space-y-3">
            {categoryBudgets.map((item, idx) => {
              // Allowed categories for this row are current category + any unused categories
              const allowedOptions = [
                item.category,
                ...availableCategoriesToAdd
              ];

              return (
                <CategoryBudgetRow
                  key={`cat-${idx}`}
                  item={item}
                  index={idx}
                  onChange={handleCategoryRowChange}
                  onRemove={handleRemoveCategoryRow}
                  availableCategories={allowedOptions}
                  currentSpend={currentSpendMap[item.category] || 0}
                />
              );
            })}

            {categoryBudgets.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                No category limits configured. Click "Add Category Limit" or use "AI Suggest Budget".
              </p>
            )}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={saving || budgetLoading}
            icon={Save}
            className="shadow-md shadow-indigo-600/20"
          >
            Save Budget Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}

export default Budget;

