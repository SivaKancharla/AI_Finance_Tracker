import React from 'react';
import { formatDate, formatCurrency } from '../../utils/format.js';
import CategoryChip from './CategoryChip.jsx';
import { Edit2, Trash2 } from 'lucide-react';

export function TransactionTable({
  transactions = [],
  onEdit,
  onDelete,
  onReview
}) {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/80">
            <tr>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Title / Merchant
              </th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Method
              </th>
              <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {transactions.map((t) => {
              const isIncome = t.type === 'income';

              return (
                <tr key={t._id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Date */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(t.transactionDate)}
                  </td>

                  {/* Title & Description */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                    {t.description && (
                      <div className="text-xs text-slate-400 truncate max-w-xs">{t.description}</div>
                    )}
                  </td>

                  {/* Category Chip */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <CategoryChip
                      category={t.category}
                      categorySource={t.categorySource}
                      needsReview={t.needsReview}
                      confidence={t.categoryConfidence ?? t.confidence}
                      onReview={() => onReview && onReview(t)}
                    />
                  </td>

                  {/* Payment Method */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 uppercase font-medium">
                    {t.paymentMethod || 'upi'}
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                    <span className={isIncome ? 'text-emerald-600' : 'text-slate-900'}>
                      {isIncome ? '+' : '-'} {formatCurrency(t.amount, true)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(t)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit transaction"
                        aria-label="Edit transaction"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(t)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete transaction"
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TransactionTable;
