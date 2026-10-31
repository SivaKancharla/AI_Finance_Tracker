import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeToast } from '../../redux/slices/uiSlice.js';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const TOAST_STYLES = {
  success: 'bg-emerald-50 text-emerald-900 border-emerald-200 shadow-emerald-100',
  error: 'bg-rose-50 text-rose-900 border-rose-200 shadow-rose-100',
  warning: 'bg-amber-50 text-amber-900 border-amber-200 shadow-amber-100',
  info: 'bg-indigo-50 text-indigo-900 border-indigo-200 shadow-indigo-100'
};

const ICON_COLORS = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  warning: 'text-amber-500',
  info: 'text-indigo-500'
};

function ToastItem({ toast, onRemove }) {
  const Icon = TOAST_ICONS[toast.type] || Info;
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const iconColor = ICON_COLORS[toast.type] || ICON_COLORS.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm w-full transition-all transform animate-in slide-in-from-bottom-2 ${style}`}
      role="alert"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 text-sm font-medium leading-snug">{toast.message}</div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-slate-400 hover:text-slate-600 rounded-lg p-0.5 focus:outline-none"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const dispatch = useDispatch();
  const toasts = useSelector((state) => state.ui.toasts);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={(id) => dispatch(removeToast(id))}
        />
      ))}
    </div>
  );
}

export default ToastContainer;
