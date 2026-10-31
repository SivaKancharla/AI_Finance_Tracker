import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Sparkles, Check } from 'lucide-react';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import aiService from '../../services/aiService.js';

export function TransactionForm({
  initialData = null,
  onSave,
  onCancel,
  loading = false
}) {
  const isEdit = Boolean(initialData?._id);
  const expenseCategories = useSelector((state) => state.meta.expenseCategories);
  const incomeCategories = useSelector((state) => state.meta.incomeCategories);
  const paymentMethods = useSelector((state) => state.meta.paymentMethods);

  // Form State
  const [type, setType] = useState(initialData?.type || 'expense');
  const [title, setTitle] = useState(initialData?.title || '');
  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [category, setCategory] = useState(
    initialData?.category || (isEdit ? 'Other' : '__AUTO__')
  );
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || 'upi');
  const [transactionDate, setTransactionDate] = useState(
    initialData?.transactionDate
      ? new Date(initialData.transactionDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [errors, setErrors] = useState({});

  // Live AI Suggestion State
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const abortControllerRef = useRef(null);

  const categories = type === 'income' ? incomeCategories : expenseCategories;

  // Live Categorization Debounce (600ms)
  useEffect(() => {
    // Only suggest for new transactions with title >= 3 chars and valid amount
    if (isEdit || category !== '__AUTO__') return;
    if (title.trim().length < 3 || Number(amount) <= 0) {
      setAiSuggestion(null);
      setAiLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAiLoading(true);
    setAiError(false);

    const timer = setTimeout(async () => {
      try {
        const res = await aiService.categorize(
          {
            title: title.trim(),
            amount: Number(amount),
            type,
            description: description.trim()
          },
          { signal: controller.signal }
        );

        if (res && res.data) {
          setAiSuggestion(res.data);
        }
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setAiError(true);
        }
      } finally {
        setAiLoading(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title, amount, type, description, isEdit, category]);

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!amount || Number(amount) <= 0) errs.amount = 'Valid amount is required';
    if (!transactionDate) errs.transactionDate = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      type,
      title: title.trim(),
      amount: Number(amount),
      paymentMethod,
      transactionDate,
      description: description.trim()
    };

    // If explicit category is picked (not __AUTO__), send it
    if (category && category !== '__AUTO__') {
      payload.category = category;
    }

    onSave(payload);
  };

  const handleUseSuggestion = () => {
    if (aiSuggestion?.category) {
      setCategory(aiSuggestion.category);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type Toggle */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Transaction Type
        </label>
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              if (category !== '__AUTO__' && !expenseCategories.includes(category)) {
                setCategory('Food');
              }
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${
              type === 'expense'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              if (category !== '__AUTO__' && !incomeCategories.includes(category)) {
                setCategory('Salary');
              }
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${
              type === 'income'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Income
          </button>
        </div>
      </div>

      {/* Title */}
      <Input
        label="Title / Merchant"
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Swiggy Bangalore, Amazon, Uber"
        required
        error={errors.title}
      />

      {/* Amount & Date Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Amount (₹)"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
          error={errors.amount}
        />

        <Input
          label="Date"
          name="transactionDate"
          type="date"
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          required
          error={errors.transactionDate}
        />
      </div>

      {/* Category with Auto (AI) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="block w-full rounded-lg border border-slate-300 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
        >
          {!isEdit && (
            <option value="__AUTO__">✨ Auto (AI Categorization)</option>
          )}
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Live AI Suggestion Strip */}
        {category === '__AUTO__' && (
          <div className="mt-2 min-h-[32px] flex items-center">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-indigo-600 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                <span>AI analyzing merchant and amount...</span>
              </div>
            ) : aiSuggestion ? (
              <div className="w-full flex items-center justify-between p-2 bg-indigo-50/80 border border-indigo-100 rounded-lg text-xs">
                <div className="flex items-center gap-1.5 text-indigo-900 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>
                    Suggested: <strong>{aiSuggestion.category}</strong>{' '}
                    ({Math.round((aiSuggestion.confidence || 0.9) * 100)}% confidence)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUseSuggestion}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-sm"
                >
                  <Check className="h-3 w-3" />
                  Use this
                </button>
              </div>
            ) : aiError ? (
              <p className="text-xs text-slate-400">
                AI suggestion unavailable; server rules will categorize on save.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Payment Method */}
      <Select
        label="Payment Method"
        name="paymentMethod"
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
        options={paymentMethods.map((m) => ({
          value: m,
          label: m.toUpperCase()
        }))}
      />

      {/* Optional Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          rows="2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional notes or tags..."
          className="block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
        <Button variant="outline" size="md" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" size="md" type="submit" loading={loading}>
          {isEdit ? 'Update Transaction' : 'Save Transaction'}
        </Button>
      </div>
    </form>
  );
}

export default TransactionForm;
