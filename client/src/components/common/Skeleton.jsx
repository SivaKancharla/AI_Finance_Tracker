import React from 'react';

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-pulse space-y-4">
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      <div className="h-8 bg-slate-200 rounded w-2/3" />
      <div className="h-3 bg-slate-200 rounded w-1/2" />
    </div>
  );
}

export function SkeletonChart({ height = 'h-72' }) {
  return (
    <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-pulse flex flex-col justify-between ${height}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="h-5 bg-slate-200 rounded w-1/4" />
        <div className="h-4 bg-slate-200 rounded w-16" />
      </div>
      <div className="flex-1 bg-slate-100 rounded-lg flex items-end p-4 gap-4">
        <div className="h-1/3 bg-slate-200 rounded w-full" />
        <div className="h-2/3 bg-slate-200 rounded w-full" />
        <div className="h-1/2 bg-slate-200 rounded w-full" />
        <div className="h-4/5 bg-slate-200 rounded w-full" />
        <div className="h-3/5 bg-slate-200 rounded w-full" />
        <div className="h-full bg-slate-200 rounded w-full" />
      </div>
    </div>
  );
}

export default Skeleton;
