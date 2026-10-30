import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center border border-slate-200">
        <div className="w-12 h-12 bg-indigo-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          FT
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">FinTrack</h1>
        <p className="text-slate-600 text-sm mb-6">
          AI-Powered Personal Finance Tracker
        </p>
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          Scaffold Active & Ready (Phase P0)
        </div>
      </div>
    </div>
  );
}

export default App;

