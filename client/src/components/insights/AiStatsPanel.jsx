import React from 'react';
import { Activity, ShieldCheck, Zap, Brain } from 'lucide-react';

export function AiStatsPanel({ stats }) {
  if (!stats) return null;

  const {
    totalCalls = 0,
    successRate = 100,
    fallbackRate = 0,
    providers = {},
    categorizationBySource = {},
    memoryEntries = 0
  } = stats;

  const totalCategorized =
    Object.values(categorizationBySource).reduce((a, b) => a + b, 0) || 1;

  const sourcePercentages = {
    memory: Math.round(((categorizationBySource.memory || 0) / totalCategorized) * 100),
    llm: Math.round(((categorizationBySource.llm || 0) / totalCategorized) * 100),
    rule: Math.round(((categorizationBySource.rule || 0) / totalCategorized) * 100),
    user: Math.round(((categorizationBySource.user || 0) / totalCategorized) * 100)
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              AI Reliability & Observability (Last 30 Days)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Production metrics tracked by server-side AiCallLog telemetry
          </p>
        </div>

        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> High Availability
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Calls</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalCalls}</p>
        </div>

        <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 text-center">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Success Rate</span>
          <p className="text-xl font-bold text-emerald-800 mt-1">{successRate}%</p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Fallback Rate</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{fallbackRate}%</p>
        </div>

        <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-100 text-center">
          <span className="text-[11px] font-semibold text-teal-700 uppercase">Learned Memory</span>
          <p className="text-xl font-bold text-teal-800 mt-1">{memoryEntries} rules</p>
        </div>
      </div>

      {/* Provider Latencies */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-500" /> Provider Latency & Health
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(providers).map(([name, data]) => (
            <div
              key={name}
              className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
            >
              <div className="flex justify-between items-center font-bold text-slate-900">
                <span className="capitalize">{name} API</span>
                <span className="text-emerald-600">{data.successRate}% OK</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Calls: {data.calls}</span>
                <span>Avg: {data.avgLatencyMs}ms</span>
                <span>p95: {data.p95LatencyMs}ms</span>
              </div>
            </div>
          ))}
          {Object.keys(providers).length === 0 && (
            <p className="text-xs text-slate-400 col-span-2">No provider calls recorded yet.</p>
          )}
        </div>
      </div>

      {/* Categorization Source Split */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-indigo-500" /> Categorization by Source
        </h4>

        {/* Multi-segment Progress Bar */}
        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="bg-teal-500 h-full"
            style={{ width: `${sourcePercentages.memory}%` }}
            title={`Learned Memory: ${sourcePercentages.memory}%`}
          />
          <div
            className="bg-indigo-600 h-full"
            style={{ width: `${sourcePercentages.llm}%` }}
            title={`AI (LLM): ${sourcePercentages.llm}%`}
          />
          <div
            className="bg-amber-400 h-full"
            style={{ width: `${sourcePercentages.rule}%` }}
            title={`Rules: ${sourcePercentages.rule}%`}
          />
          <div
            className="bg-slate-400 h-full"
            style={{ width: `${sourcePercentages.user}%` }}
            title={`Manual/User: ${sourcePercentages.user}%`}
          />
        </div>

        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-500 flex-shrink-0" />
            <span className="text-slate-600">Memory: {sourcePercentages.memory}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 flex-shrink-0" />
            <span className="text-slate-600">AI: {sourcePercentages.llm}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="text-slate-600">Rules: {sourcePercentages.rule}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400 flex-shrink-0" />
            <span className="text-slate-600">Manual: {sourcePercentages.user}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiStatsPanel;
