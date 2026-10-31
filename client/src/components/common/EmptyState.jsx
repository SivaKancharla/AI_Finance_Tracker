import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button.jsx';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No data found',
  description = 'There are no items to display at this time.',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = ''
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm ${className}`}
    >
      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-inner">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      
      {(actionText || secondaryActionText) && (
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {actionText && (
            <Button variant="primary" size="md" onClick={onAction}>
              {actionText}
            </Button>
          )}
          {secondaryActionText && (
            <Button variant="outline" size="md" onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
