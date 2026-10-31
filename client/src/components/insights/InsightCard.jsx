import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import Badge from '../common/Badge.jsx';

const SEVERITY_CONFIG = {
  critical: {
    border: 'border-rose-200 bg-rose-50/60',
    icon: AlertCircle,
    iconColor: 'text-rose-600 bg-rose-100',
    badgeVariant: 'danger',
    titleColor: 'text-rose-950'
  },
  warning: {
    border: 'border-amber-200 bg-amber-50/60',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 bg-amber-100',
    badgeVariant: 'warning',
    titleColor: 'text-amber-950'
  },
  info: {
    border: 'border-indigo-100 bg-indigo-50/40',
    icon: Info,
    iconColor: 'text-indigo-600 bg-indigo-100',
    badgeVariant: 'info',
    titleColor: 'text-indigo-950'
  }
};

export function InsightCard({ insight }) {
  const { title, detail, severity = 'info', category } = insight;
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${config.border}`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${config.iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h4 className={`text-sm font-bold tracking-tight ${config.titleColor}`}>
              {title}
            </h4>
            <div className="flex items-center gap-1.5">
              {category && (
                <Badge variant="neutral" size="xs">
                  {category}
                </Badge>
              )}
              <Badge variant={config.badgeVariant} size="xs" className="uppercase font-bold">
                {severity}
              </Badge>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}

export default InsightCard;
