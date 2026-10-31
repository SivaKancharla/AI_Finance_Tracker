import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatMonthName } from '../../utils/format.js';

export function TrendChart({ trend = [] }) {
  if (!trend || trend.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col items-center justify-center h-80 text-center">
        <p className="text-sm text-slate-400">No trend data available for this timeframe</p>
      </div>
    );
  }

  // Format data for chart
  const data = trend.map((item) => ({
    ...item,
    name: formatMonthName(item.month).split(' ')[0], // e.g. "Oct"
    fullName: formatMonthName(item.month)
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-semibold text-slate-300">{point.fullName}</p>
          <p className="text-sm font-bold text-indigo-400">
            Expenses: {formatCurrency(point.expense)}
          </p>
          {point.income > 0 && (
            <p className="text-emerald-400">Income: {formatCurrency(point.income)}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Spending Trend</h3>
          <p className="text-xs text-slate-500 mt-0.5">Historical monthly expenses (last 6 months)</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full">
          6 Months
        </span>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#4f46e5"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#expenseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrendChart;
