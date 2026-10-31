import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/format.js';
import CategoryChip from '../transactions/CategoryChip.jsx';
import { ArrowUpRight } from 'lucide-react';

export function RecentTransactions({ transactions = [], onReviewTransaction }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 text-center">
        <h3 className="text-base font-semibold text-slate-900 mb-2">Recent Transactions</h3>
        <p className="text-sm text-slate-500 py-6">No recent transactions recorded</p>
        <Link
          to="/transactions"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Add your first transaction →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Recent Transactions</h3>
          <p className="text-xs text-slate-500 mt-0.5">Your latest 5 financial activities</p>
        </div>
        <Link
          to="/transactions"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>View all</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {transactions.slice(0, 5).map((t) => {
          const isIncome = t.type === 'income';

          return (
            <div
              key={t._id}
              className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 rounded-lg px-2 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{t.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-slate-400">{formatDate(t.transactionDate)}</span>
                  <CategoryChip
                    category={t.category}
                    categorySource={t.categorySource}
                    needsReview={t.needsReview}
                    confidence={t.categoryConfidence ?? t.confidence}
                    onReview={() => onReviewTransaction && onReviewTransaction(t)}
                  />
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p
                  className={`text-sm font-bold ${
                    isIncome ? 'text-emerald-600' : 'text-slate-900'
                  }`}
                >
                  {isIncome ? '+' : '-'} {formatCurrency(t.amount, true)}
                </p>
                <span className="text-[10px] text-slate-400 uppercase font-medium">
                  {t.paymentMethod || 'upi'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecentTransactions;
