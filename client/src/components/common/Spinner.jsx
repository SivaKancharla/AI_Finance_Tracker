import React from 'react';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
    xl: 'h-12 w-12 border-4'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-slate-200 border-t-indigo-600 ${sizes[size] || sizes.md}`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

export default Spinner;
