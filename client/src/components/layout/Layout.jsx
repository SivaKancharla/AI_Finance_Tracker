import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import ToastContainer from '../common/Toast.jsx';
import { WifiOff } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard Overview',
  '/transactions': 'Transactions Ledger',
  '/import': 'Statement Ingestion & Active Learning',
  '/budget': 'Budget Planner & AI Suggestions',
  '/insights': 'AI Financial Insights & Reliability',
  '/reports': 'Monthly Analytics & PDF Report',
  '/profile': 'User Profile & Security'
};

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const networkError = useSelector((state) => state.auth.networkError);

  const currentTitle = PAGE_TITLES[location.pathname] || 'FinTrack';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex-1 flex flex-col">
        <Navbar
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          title={currentTitle}
        />

        {networkError && (
          <div className="bg-amber-500 text-white px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 shadow-sm">
            <WifiOff className="h-4 w-4" />
            <span>Connection to server lost. Running in offline/cached mode.</span>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}

export default Layout;
