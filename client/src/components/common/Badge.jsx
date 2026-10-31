import React from 'react';

const VARIANTS = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  // AI Source Special Variants
  ai: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  learned: 'bg-teal-50 text-teal-700 border-teal-200',
  rule: 'bg-slate-100 text-slate-600 border-slate-200',
  review: 'bg-amber-100 text-amber-800 border-amber-300 font-medium animate-pulse'
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
  icon: Icon
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.neutral;
  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${variantClass} ${sizeClass} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export default Badge;
