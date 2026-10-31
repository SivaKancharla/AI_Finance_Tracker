import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { useSelector } from 'react-redux';
import Button from '../common/Button.jsx';

export function FiltersBar({ filters, onFilterChange, onReset }) {
  const expenseCategories = useSelector((state) => state.meta.expenseCategories);
  const incomeCategories = useSelector((state) => state.meta.incomeCategories);
  const allCategories = Array.from(new Set([...expenseCategories, ...incomeCategories]));

  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value, page: 1 });
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            name="search"
            value={filters.search || ''}
            onChange={handleChange}
            placeholder="Search merchant, title..."
            className="block w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Type Select */}
        <div>
          <select
            name="type"
            value={filters.type || ''}
            onChange={handleChange}
            className="block w-full rounded-xl border border-slate-300 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        {/* Category Select */}
        <div>
          <select
            name="category"
            value={filters.category || ''}
            onChange={handleChange}
            className="block w-full rounded-xl border border-slate-300 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Categories</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Select */}
        <div>
          <select
            name="sort"
            value={filters.sort || 'latest'}
            onChange={handleChange}
            className="block w-full rounded-xl border border-slate-300 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          >
            <option value="latest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_desc">Amount: High to Low</option>
            <option value="amount_asc">Amount: Low to High</option>
          </select>
        </div>

        {/* Reset Button */}
        <div>
          <Button
            variant="outline"
            size="md"
            onClick={onReset}
            className="w-full justify-center text-slate-600"
            icon={RotateCcw}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FiltersBar;
