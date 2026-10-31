import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Copy, AlertTriangle, ArrowRight, Upload } from 'lucide-react';
import Button from '../common/Button.jsx';

export function ImportSummary({ result, onReset }) {
  const { imported = 0, duplicates = 0, failed = 0 } = result || {};

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6">
      <div className="mx-auto h-16 w-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Statement Ingestion Complete</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your transactions have been processed and saved to your personal ledger.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div>
          <span className="text-xs text-emerald-700 font-semibold uppercase">Imported</span>
          <p className="text-2xl font-extrabold text-slate-900">{imported}</p>
        </div>
        <div>
          <span className="text-xs text-amber-700 font-semibold uppercase">Skipped Dupes</span>
          <p className="text-2xl font-extrabold text-slate-900">{duplicates}</p>
        </div>
        <div>
          <span className="text-xs text-rose-700 font-semibold uppercase">Failed</span>
          <p className="text-2xl font-extrabold text-slate-900">{failed}</p>
        </div>
      </div>

      <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 text-left space-y-1">
        <p className="font-semibold">💡 Active Learning Applied</p>
        <p className="text-indigo-700 leading-relaxed">
          Any category adjustments made during preview have been automatically saved to your per-user merchant memory (`CategoryMemory`). Future transactions from those merchants will be categorized automatically without calling the LLM!
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button variant="outline" size="md" onClick={onReset} icon={Upload}>
          Import Another Statement
        </Button>
        <Link to="/transactions">
          <Button variant="primary" size="md">
            <span>View Transactions</span>
            <ArrowRight className="-mr-0.5 ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default ImportSummary;
