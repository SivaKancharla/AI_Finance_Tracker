import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/common/Button.jsx';

export function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <span className="text-6xl font-extrabold text-indigo-600">404</span>
      <h2 className="mt-4 text-2xl font-bold text-slate-900 tracking-tight">Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <div className="mt-6">
        <Link to="/dashboard">
          <Button variant="primary" size="md" icon={Home}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFound;

