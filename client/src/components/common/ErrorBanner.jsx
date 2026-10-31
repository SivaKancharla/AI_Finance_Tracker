import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button.jsx';

export function ErrorBanner({
  title = 'Something went wrong',
  message,
  onRetry,
  className = ''
}) {
  if (!message) return null;

  return (
    <div
      className={`rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          {title && <h4 className="font-semibold text-rose-900">{title}</h4>}
          <p className="mt-0.5 text-rose-700">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-rose-300 text-rose-700 hover:bg-rose-100 flex-shrink-0"
            icon={RefreshCw}
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

export default ErrorBanner;
