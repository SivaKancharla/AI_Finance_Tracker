import React from 'react';

export function Select({
  label,
  id,
  name,
  options = [],
  error,
  helperText,
  className = '',
  required = false,
  ...props
}) {
  const selectId = id || name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        required={required}
        className={`block w-full rounded-lg border text-sm transition-colors py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 bg-white ${
          error
            ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500'
            : 'border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}

export default Select;
