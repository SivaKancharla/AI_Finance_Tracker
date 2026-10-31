import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { formatDate, formatCurrency } from '../../utils/format.js';
import Button from '../common/Button.jsx';
import { Sparkles, Brain, Code2, AlertCircle, CheckCircle2, Copy } from 'lucide-react';

export function ImportPreviewTable({
  previewData,
  onCommit,
  onCancel,
  loading = false
}) {
  const expenseCategories = useSelector((state) => state.meta.expenseCategories);
  const incomeCategories = useSelector((state) => state.meta.incomeCategories);

  const [rows, setRows] = useState(previewData?.transactions || []);
  const [filterNeedsReview, setFilterNeedsReview] = useState(false);
  const [hideDuplicates, setHideDuplicates] = useState(false);

  // Selection set (indices) - by default select all valid, non-duplicate rows
  const [selectedIndices, setSelectedIndices] = useState(() => {
    const set = new Set();
    (previewData?.transactions || []).forEach((row, idx) => {
      if (row.isValid && !row.isDuplicate) {
        set.add(idx);
      }
    });
    return set;
  });

  const summary = previewData?.summary || {};

  const handleCategoryChange = (index, newCat) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        category: newCat,
        edited: true,
        needsReview: false
      };
      return copy;
    });
  };

  const toggleSelect = (index) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = (select) => {
    if (select) {
      const all = new Set();
      rows.forEach((r, idx) => {
        if (r.isValid) all.add(idx);
      });
      setSelectedIndices(all);
    } else {
      setSelectedIndices(new Set());
    }
  };

  // Filtered rows for display
  const displayedRows = rows
    .map((r, originalIdx) => ({ ...r, originalIdx }))
    .filter((r) => {
      if (filterNeedsReview && !r.needsReview) return false;
      if (hideDuplicates && r.isDuplicate) return false;
      return true;
    });

  const handleCommitClick = () => {
    const selectedRows = rows
      .filter((_, idx) => selectedIndices.has(idx) && rows[idx].isValid)
      .map((r) => ({
        title: r.title,
        amount: r.amount,
        type: r.type,
        category: r.category,
        paymentMethod: r.paymentMethod || 'upi',
        transactionDate: r.transactionDate,
        description: r.description || '',
        categorySource: r.categorySource,
        confidence: r.confidence,
        edited: Boolean(r.edited),
        dedupeHash: r.dedupeHash
      }));

    onCommit(selectedRows);
  };

  return (
    <div className="space-y-6">
      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
          <span className="text-xs text-slate-500 font-medium">Total Rows</span>
          <p className="text-lg font-bold text-slate-800">{summary.total || rows.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
          <span className="text-xs text-emerald-700 font-medium">Valid</span>
          <p className="text-lg font-bold text-emerald-800">{summary.valid || 0}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
          <span className="text-xs text-amber-700 font-medium">Duplicates</span>
          <p className="text-lg font-bold text-amber-800">{summary.duplicates || 0}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-center">
          <span className="text-xs text-rose-700 font-medium">Invalid</span>
          <p className="text-lg font-bold text-rose-800">{summary.invalid || 0}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-center">
          <span className="text-xs text-indigo-700 font-medium">Categorized by AI</span>
          <p className="text-lg font-bold text-indigo-800">{summary.bySource?.llm || 0}</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl text-center">
          <span className="text-xs text-teal-700 font-medium">Learned Memory</span>
          <p className="text-lg font-bold text-teal-800">{summary.bySource?.memory || 0}</p>
        </div>
      </div>

      {/* Filter & Selection Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={filterNeedsReview}
              onChange={(e) => setFilterNeedsReview(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Needs Review Only</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={hideDuplicates}
              onChange={(e) => setHideDuplicates(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Hide Duplicates</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectAll(true)}
            className="text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            Select All
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => handleSelectAll(false)}
            className="text-slate-500 hover:text-slate-700 font-medium"
          >
            Deselect All
          </button>
          <span className="text-slate-300">|</span>
          <span className="font-bold text-slate-800">
            {selectedIndices.size} selected for import
          </span>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left w-10">Include</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Category (Edit)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Source</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedRows.map((r) => {
                const isSelected = selectedIndices.has(r.originalIdx);
                const categories = r.type === 'income' ? incomeCategories : expenseCategories;

                return (
                  <tr
                    key={`row-${r.originalIdx}`}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      r.isDuplicate ? 'bg-amber-50/30' : !r.isValid ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!r.isValid}
                        onChange={() => toggleSelect(r.originalIdx)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                      />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                      {formatDate(r.transactionDate)}
                    </td>

                    {/* Title */}
                    <td className="px-4 py-2.5 font-medium text-slate-900 max-w-xs truncate">
                      {r.title}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(r.amount, true)}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`font-semibold uppercase text-[10px] ${
                          r.type === 'income' ? 'text-emerald-600' : 'text-slate-600'
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>

                    {/* Editable Category */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <select
                        value={r.category}
                        onChange={(e) => handleCategoryChange(r.originalIdx, e.target.value)}
                        className={`text-xs rounded-lg border py-1 pl-2 pr-6 focus:ring-1 focus:ring-indigo-500 ${
                          r.edited
                            ? 'border-indigo-400 bg-indigo-50/40 font-semibold text-indigo-900'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {r.edited && (
                        <span className="ml-1.5 text-[10px] font-bold text-indigo-600">Edited</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {r.categorySource === 'memory' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-teal-700 font-semibold">
                          <Brain className="h-3 w-3" /> Learned
                        </span>
                      ) : r.categorySource === 'llm' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 font-semibold">
                          <Sparkles className="h-3 w-3" /> AI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <Code2 className="h-3 w-3" /> Rule
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {r.isDuplicate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <Copy className="h-2.5 w-2.5" /> Duplicate
                        </span>
                      ) : !r.isValid ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200"
                          title={r.errors?.join(', ') || 'Validation error'}
                        >
                          <AlertCircle className="h-2.5 w-2.5" /> Invalid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="md" onClick={onCancel} disabled={loading}>
          Cancel & Upload Another File
        </Button>

        <Button
          variant="primary"
          size="md"
          onClick={handleCommitClick}
          disabled={selectedIndices.size === 0 || loading}
          loading={loading}
        >
          Confirm & Import {selectedIndices.size} Transactions
        </Button>
      </div>
    </div>
  );
}

export default ImportPreviewTable;
