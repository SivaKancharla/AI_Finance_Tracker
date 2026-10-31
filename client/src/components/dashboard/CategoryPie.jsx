import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../utils/format.js';

const PALETTE = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#64748b', // Slate
  '#ef4444', // Red
  '#14b8a6'  // Teal
];

export function CategoryPie({ categories = [] }) {
  // Only display categories with non-zero spending
  const activeCategories = categories.filter((c) => Number(c.amount) > 0);

  if (!categories || categories.length === 0 || activeCategories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col items-center justify-center h-80 text-center">
        <p className="text-sm text-slate-400">No category breakdown for this month</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = data.percent ?? data.percentage ?? 0;
      return (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-semibold text-slate-200">{data.category}</p>
          <p className="text-sm font-bold text-indigo-400">{formatCurrency(data.amount)}</p>
          <p className="text-slate-400">{pct}% of total expenses</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">Category Breakdown</h3>
        <p className="text-xs text-slate-500 mt-0.5">Distribution of spending across categories</p>
      </div>

      <div className="h-56 w-full relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={activeCategories}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={2}
            >
              {activeCategories.map((entry, index) => (
                <Cell
                  key={`cell-${entry.category}-${index}`}
                  fill={PALETTE[index % PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs max-h-32 overflow-y-auto pr-1">
        {activeCategories.slice(0, 6).map((cat, idx) => (
          <div key={cat.category} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
            />
            <span className="text-slate-600 truncate">{cat.category}</span>
            <span className="font-semibold text-slate-900 ml-auto">
              {cat.percent ?? cat.percentage ?? 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryPie;
