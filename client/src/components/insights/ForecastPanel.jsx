import React from 'react';
import { TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/format.js';

export function ForecastPanel({ forecastData }) {
  if (!forecastData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-400">
        Forecast calculations will populate as spending data is logged.
      </div>
    );
  }

  const projectedTotal =
    forecastData.predictedExpense ??
    forecastData.projectedTotal ??
    forecastData.currentMonth?.projectedMonthEnd ??
    0;
  const historicalAverage = forecastData.historicalAverage ?? 0;
  const rawConfidence = forecastData.confidence ?? 0.5;
  const confidencePct =
    rawConfidence > 1 ? Math.min(100, Math.round(rawConfidence)) : Math.round(rawConfidence * 100);
  const budgetRisk = Boolean(forecastData.budgetRisk);
  const method = forecastData.method ?? 'blended';
  const explanation = forecastData.explanation;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Run-Rate Spending Forecast
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical projection blending daily run-rate with historical spending velocity
          </p>
        </div>

        {budgetRisk ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            Budget Overrun Risk
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Within Budget Target
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Projected Month-End Spend
          </span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(projectedTotal)}
          </p>
          <span className="text-[11px] text-slate-400">
            Based on current daily burn rate
          </span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            3-Month Historical Average
          </span>
          <p className="text-2xl font-extrabold text-slate-700 mt-1">
            {formatCurrency(historicalAverage)}
          </p>
          <span className="text-[11px] text-slate-400">
            Complete previous months baseline
          </span>
        </div>
      </div>

      {/* Confidence Meter */}
      <div>
        <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
          <span className="text-slate-600">Model Confidence</span>
          <span className="font-bold text-slate-800">{confidencePct}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              confidencePct >= 70
                ? 'bg-indigo-600'
                : confidencePct >= 40
                ? 'bg-amber-500'
                : 'bg-slate-400'
            }`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          {explanation ||
            `Forecast calculated via ${method} statistical modeling. Confidence strengthens as the calendar month progresses and daily variance stabilizes.`}
        </p>
      </div>
    </div>
  );
}

export default ForecastPanel;
