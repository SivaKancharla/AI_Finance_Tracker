import React from 'react';
import { formatCurrency } from '../../utils/format.js';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BudgetProgress({
  monthlyBudget,
  totalExpense,
  budgetRemaining,
  budgetUsagePercent
}) {
  if (!monthlyBudget || monthlyBudget <= 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Monthly Budget Progress</h3>
          <p className="text-sm text-slate-500 mt-1">
            You have not set a spending budget for this month yet.
          </p>
        </div>
        <Link
          to="/budget"
          className="inline-flex items-center px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
        >
          Set Monthly Budget →
        </Link>
      </div>
    );
  }

  const percent = Math.min(100, Math.max(0, budgetUsagePercent || 0));
  const isOverBudget = budgetUsagePercent >= 100;
  const isWarning = budgetUsagePercent >= 80 && !isOverBudget;

  const barColor = isOverBudget
    ? 'bg-rose-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Monthly Budget Utilization</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Spent <span className="font-semibold text-slate-900">{formatCurrency(totalExpense)}</span> of{' '}
            <span className="font-semibold text-slate-900">{formatCurrency(monthlyBudget)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOverBudget ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
              Overspent by {formatCurrency(Math.abs(budgetRemaining))}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {formatCurrency(budgetRemaining)} remaining
            </span>
          )}
          <span className="text-sm font-bold text-slate-700">{Math.round(budgetUsagePercent || 0)}%</span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {isOverBudget && (
        <div className="mt-3 text-xs font-medium text-rose-600 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Alert: You have exceeded your target budget for this calendar month.</span>
        </div>
      )}
    </div>
  );
}

export default BudgetProgress;
