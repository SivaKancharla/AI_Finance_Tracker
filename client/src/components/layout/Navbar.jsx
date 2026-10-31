import React from 'react';
import { Menu, Sparkles } from 'lucide-react';
import { useSelector } from 'react-redux';

export function Navbar({ onMenuToggle, title = 'Dashboard' }) {
  const user = useSelector((state) => state.auth.user);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>Llama 3.3 / Gemini AI active</span>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="hidden md:inline text-sm font-medium text-slate-700">
            {user?.name || 'Account'}
          </span>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
