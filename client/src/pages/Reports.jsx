import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { addToast } from '../redux/slices/uiSlice.js';
import reportService from '../services/reportService.js';
import { useMonthParam } from '../hooks/useMonthParam.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import Button from '../components/common/Button.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { FileDown, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export function Reports() {
  const dispatch = useDispatch();
  const { monthKey, monthLabel, prevMonth, nextMonth } = useMonthParam();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getMonthlyReport({ year, month });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate monthly report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [year, month]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blobData = await reportService.downloadMonthlyReport({ year, month });
      const blob = new Blob([blobData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finance-report-${monthKey}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      dispatch(
        addToast({
          type: 'success',
          message: `Report downloaded: finance-report-${monthKey}.pdf`
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: 'Failed to download PDF report. Please try again.'
        })
      );
    } finally {
      setDownloading(false);
    }
  };

  const summary = report?.summary || {};
  const transactions = report?.transactions || [];
  const categoryBreakdown = summary?.categoryBreakdown || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-base font-bold text-slate-900 min-w-[140px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Download PDF Button */}
        <Button
          variant="primary"
          size="md"
          onClick={handleDownloadPdf}
          loading={downloading}
          disabled={loading || transactions.length === 0}
          icon={FileDown}
          className="shadow-md shadow-indigo-600/20"
        >
          Export Official PDF
        </Button>
      </div>

      <ErrorBanner message={error} onRetry={fetchReport} />

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase">Income</span>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">
            {formatCurrency(summary.totalIncome || 0)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase">Expenses</span>
          <p className="text-xl font-extrabold text-rose-600 mt-1">
            {formatCurrency(summary.totalExpense || 0)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase">Savings</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(summary.savings || 0)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase">Transactions</span>
          <p className="text-xl font-extrabold text-indigo-600 mt-1">
            {summary.transactionCount || 0}
          </p>
        </div>
      </div>

      {/* Category Spending Bar Chart */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Category Spending Totals</h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryBreakdown}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(v) => `₹${v}`} fontSize={11} stroke="#94a3b8" />
                <YAxis dataKey="category" type="category" fontSize={11} stroke="#64748b" width={90} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Spent']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="amount" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Statement Ledger ({transactions.length} items)
          </h3>
          <span className="text-xs text-slate-400">
            Period: {report?.period?.start ? formatDate(report.period.start) : ''} to{' '}
            {report?.period?.end ? formatDate(report.period.end) : ''}
          </span>
        </div>

        {transactions.length > 0 ? (
          <div className="overflow-x-auto max-h-[450px]">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Title</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Category</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(t.transactionDate)}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900">{t.title}</td>
                    <td className="px-6 py-3 text-slate-600 whitespace-nowrap">{t.category}</td>
                    <td
                      className={`px-6 py-3 text-right font-bold whitespace-nowrap ${
                        t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">
            No transactions found for this billing period.
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;

