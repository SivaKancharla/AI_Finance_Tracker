import React, { useEffect, useState } from 'react';
import { useMonthParam } from '../hooks/useMonthParam.js';
import dashboardService from '../services/dashboardService.js';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Wallet,
  AlertTriangle,
  Plus,
  FileSpreadsheet
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SummaryCard from '../components/dashboard/SummaryCard.jsx';
import BudgetProgress from '../components/dashboard/BudgetProgress.jsx';
import TrendChart from '../components/dashboard/TrendChart.jsx';
import CategoryPie from '../components/dashboard/CategoryPie.jsx';
import IncomeExpenseBar from '../components/dashboard/IncomeExpenseBar.jsx';
import RecentTransactions from '../components/dashboard/RecentTransactions.jsx';
import { SkeletonCard, SkeletonChart } from '../components/common/Skeleton.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import Button from '../components/common/Button.jsx';
import { formatCurrency } from '../utils/format.js';

export function Dashboard() {
  const { monthKey, monthLabel, prevMonth, nextMonth, isCurrentMonth } = useMonthParam();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getDashboardSummary(monthKey);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [monthKey]);

  const summary = data?.summary || {};
  const trend = data?.trend || [];
  const forecast = data?.forecast || null;
  const recentTransactions = data?.recentTransactions || [];
  const hasTransactions =
    (summary.transactionCount ??
      (summary.totalExpense > 0 || summary.totalIncome > 0 ? 1 : 0)) > 0;

  return (
    <div className="space-y-6">
      {/* Top Bar: Month Selector & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center min-w-[150px]">
            <span className="text-base font-bold text-slate-900 block">{monthLabel}</span>
            {isCurrentMonth && (
              <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                Current Month
              </span>
            )}
          </div>

          <button
            onClick={nextMonth}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/import">
            <Button variant="outline" size="md" icon={FileSpreadsheet}>
              Import CSV
            </Button>
          </Link>
          <Link to="/transactions?action=new">
            <Button variant="primary" size="md" icon={Plus}>
              Add Expense
            </Button>
          </Link>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={fetchSummary} />

      {/* Forecast Strip (Current Month Only) */}
      {forecast && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Run-Rate Spending Projection</p>
              <p className="text-base font-extrabold text-slate-900">
                Projected this month:{' '}
                {formatCurrency(
                  forecast.predictedExpense ??
                    forecast.projectedTotal ??
                    forecast.currentMonth?.projectedMonthEnd ??
                    0
                )}{' '}
                <span className="text-xs font-medium text-slate-500">
                  (
                  {forecast.confidence > 1
                    ? Math.min(100, Math.round(forecast.confidence))
                    : Math.round(forecast.confidence * 100)}
                  % model confidence)
                </span>
              </p>
            </div>
          </div>

          {forecast.budgetRisk ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Budget Overrun Risk
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-500 self-center">
              Paced within historical limits
            </span>
          )}
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Income"
            amount={summary.totalIncome || 0}
            subtitle={`${monthLabel} cash inflow`}
            icon={ArrowDownRight}
            tone="emerald"
          />

          <SummaryCard
            title="Total Expenses"
            amount={summary.totalExpense || 0}
            subtitle={`${summary.transactionCount || 0} transactions logged`}
            icon={ArrowUpRight}
            tone="rose"
          />

          <SummaryCard
            title="Net Savings"
            amount={summary.savings || 0}
            subtitle={
              summary.savingsRate != null
                ? `${summary.savingsRate}% savings rate`
                : summary.totalIncome > 0
                ? `${Math.round(((summary.savings || 0) / summary.totalIncome) * 100)}% savings rate`
                : 'Based on logged cash flow'
            }
            icon={PiggyBank}
            tone={summary.savings >= 0 ? 'emerald' : 'rose'}
          />

          <SummaryCard
            title="Budget Remaining"
            amount={summary.budgetRemaining}
            subtitle={
              summary.monthlyBudget > 0
                ? `Budget: ${formatCurrency(summary.monthlyBudget)}`
                : null
            }
            icon={Wallet}
            tone={
              summary.budgetRemaining !== null && summary.budgetRemaining < 0
                ? 'rose'
                : 'indigo'
            }
            linkTo="/budget"
            linkText={summary.monthlyBudget > 0 ? 'Adjust' : 'Set Budget →'}
          />
        </div>
      )}

      {/* Monthly Budget Progress Bar */}
      {loading ? (
        <div className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      ) : (
        <BudgetProgress
          monthlyBudget={summary.monthlyBudget}
          totalExpense={summary.totalExpense}
          budgetRemaining={summary.budgetRemaining}
          budgetUsagePercent={summary.budgetUsagePercent ?? summary.budgetUsedPercent ?? 0}
        />
      )}

      {/* Visual Charts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-w-0">
            <SkeletonChart />
          </div>
          <div className="min-w-0">
            <SkeletonChart />
          </div>
        </div>
      ) : hasTransactions ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-w-0">
            <TrendChart trend={trend} />
          </div>
          <div className="min-w-0">
            <CategoryPie categories={summary.categoryBreakdown || []} />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Plus className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No activity logged for {monthLabel}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Log your daily expenses manually or import an HDFC/ICICI/SBI statement CSV to see instant visual analytics.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/import">
              <Button variant="outline" size="sm" icon={FileSpreadsheet}>
                Import CSV
              </Button>
            </Link>
            <Link to="/transactions?action=new">
              <Button variant="primary" size="sm" icon={Plus}>
                Add Expense
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Grouped Income vs Expense Bar & Recent Transactions */}
      {!loading && hasTransactions && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-w-0">
            <IncomeExpenseBar trend={trend} />
          </div>
          <div className="min-w-0">
            <RecentTransactions
              transactions={recentTransactions}
              onReviewTransaction={() => navigate('/transactions')}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

