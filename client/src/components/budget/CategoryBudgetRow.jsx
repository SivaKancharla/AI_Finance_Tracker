import React from 'react';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format.js';

export function CategoryBudgetRow({
  item,
  index,
  onChange,
  onRemove,
  availableCategories = [],
  currentSpend = 0
}) {
  const limit = Number(item.limit) || 0;
  const spent = Number(currentSpend) || 0;
  const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  const isOver = limit > 0 && spent > limit;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Selector */}
        <div className="w-full sm:w-1/3">
          <select
            value={item.category}
            onChange={(e) => onChange(index, 'category', e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500"
          >
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Limit Input */}
        <div className="flex items-center gap-2 w-full sm:w-1/3">
          <span className="text-xs text-slate-500 font-medium">Limit: ₹</span>
          <input
            type="number"
            min="0"
            step="100"
            value={item.limit}
            onChange={(e) => onChange(index, 'limit', e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-sm text-slate-900 font-bold focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Current Month Spending & Remove */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-1/3">
          <div className="text-right text-xs">
            <span className="text-slate-400">Spent: </span>
            <span className={`font-bold ${isOver ? 'text-rose-600' : 'text-slate-800'}`}>
              {formatCurrency(spent)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Remove category budget"
            aria-label="Remove category budget"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar for Current Month */}
      {limit > 0 && (
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOver ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default CategoryBudgetRow;
