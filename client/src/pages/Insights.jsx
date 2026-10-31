import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInsights, fetchForecast, fetchAiStats } from '../redux/slices/insightsSlice.js';
import InsightCard from '../components/insights/InsightCard.jsx';
import ForecastPanel from '../components/insights/ForecastPanel.jsx';
import AiStatsPanel from '../components/insights/AiStatsPanel.jsx';
import Button from '../components/common/Button.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { Sparkles, RefreshCw } from 'lucide-react';
import Badge from '../components/common/Badge.jsx';

export function Insights() {
  const dispatch = useDispatch();
  const { insights, provider, forecast, stats, loading, error } = useSelector(
    (state) => state.insights
  );

  const [refreshCooldown, setRefreshCooldown] = useState(false);

  const loadAll = (force = false) => {
    dispatch(fetchInsights({ force }));
    dispatch(fetchForecast());
    dispatch(fetchAiStats());
  };

  useEffect(() => {
    loadAll(false);
  }, [dispatch]);

  const handleRefresh = () => {
    if (refreshCooldown) return;
    setRefreshCooldown(true);
    loadAll(true);
    setTimeout(() => {
      setRefreshCooldown(false);
    }, 4000); // 4-second cooldown
  };

  const providerLabel =
    provider === 'groq'
      ? 'Llama 3.3 70B (Groq)'
      : provider === 'gemini'
      ? 'Gemini 2.5 Flash'
      : 'Deterministic Rules & Analytics';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              AI Financial Insights
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalized financial health analysis and predictive run-rate forecasting
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={provider === 'heuristic' ? 'rule' : 'ai'} size="sm">
            Engine: {providerLabel}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshCooldown}
            loading={loading}
            icon={RefreshCw}
          >
            {refreshCooldown ? 'Refreshed' : 'Refresh Insights'}
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={() => loadAll(true)} />

      {/* Insights Cards Feed */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
          Current Month Observations
        </h3>

        {loading && (!insights || insights.length === 0) ? (
          <div className="space-y-3">
            <div className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            <div className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          </div>
        ) : insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, idx) => (
              <InsightCard key={`insight-${idx}`} insight={insight} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-sm text-slate-500">
              No critical alerts or warnings for this calendar month. Your spending is on track!
            </p>
          </div>
        )}
      </div>

      {/* Forecast Panel */}
      <ForecastPanel forecastData={forecast} />

      {/* AI Usage & Observability Telemetry Panel */}
      <AiStatsPanel stats={stats} />
    </div>
  );
}

export default Insights;

