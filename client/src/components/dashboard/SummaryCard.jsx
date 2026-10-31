import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/format.js';

const TONES = {
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    iconBg: 'bg-emerald-100 text-emerald-600'
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200/80',
    iconBg: 'bg-rose-100 text-rose-600'
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200/80',
    iconBg: 'bg-indigo-100 text-indigo-600'
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
    iconBg: 'bg-amber-100 text-amber-600'
  }
};

export function SummaryCard({
  title,
  amount,
  subtitle,
  icon: Icon,
  tone = 'indigo',
  linkTo,
  linkText
}) {
  const style = TONES[tone] || TONES.indigo;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500 tracking-wide uppercase">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${style.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-4">
        {amount !== null && amount !== undefined ? (
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(amount)}
          </div>
        ) : (
          <div className="text-xl font-bold text-slate-400">No budget set</div>
        )}

        <div className="mt-2 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
          {linkTo && (
            <Link
              to={linkTo}
              className="font-semibold text-indigo-600 hover:text-indigo-800 ml-auto transition-colors"
            >
              {linkText || 'Configure →'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default SummaryCard;
