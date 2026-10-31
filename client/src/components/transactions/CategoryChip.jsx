import React from 'react';
import { Sparkles, Brain, Code2, AlertCircle } from 'lucide-react';
import Badge from '../common/Badge.jsx';

export function CategoryChip({
  category = 'Other',
  categorySource,
  needsReview = false,
  confidence,
  onReview
}) {
  const renderSourceBadge = () => {
    if (needsReview) {
      return (
        <span
          onClick={onReview}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 ${
            onReview ? 'cursor-pointer hover:bg-amber-200' : ''
          }`}
          title="Flagged for manual review"
        >
          <AlertCircle className="h-2.5 w-2.5" />
          Review
        </span>
      );
    }

    if (categorySource === 'memory') {
      return (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200"
          title="Categorized using your previous manual corrections"
        >
          <Brain className="h-2.5 w-2.5" />
          Learned
        </span>
      );
    }

    if (categorySource === 'llm') {
      return (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
          title={`Categorized by AI${confidence ? ` (${Math.round(confidence * 100)}%)` : ''}`}
        >
          <Sparkles className="h-2.5 w-2.5" />
          AI
        </span>
      );
    }

    if (categorySource === 'rule') {
      return (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
          title="Categorized by fallback keyword rule"
        >
          <Code2 className="h-2.5 w-2.5" />
          Rule
        </span>
      );
    }

    return null;
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <Badge variant="neutral" size="sm">
        {category}
      </Badge>
      {renderSourceBadge()}
    </div>
  );
}

export default CategoryChip;
