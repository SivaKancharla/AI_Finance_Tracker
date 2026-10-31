import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Download, AlertCircle } from 'lucide-react';
import Button from '../common/Button.jsx';

export function UploadDropzone({ onFileSelected, loading = false }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const processFile = (file) => {
    setError(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    if (file.size > 1024 * 1024) {
      setError('File size exceeds the 1MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      onFileSelected(selectedFile);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".csv"
          className="hidden"
        />

        <div className="mx-auto h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
          <UploadCloud className="h-8 w-8" />
        </div>

        <h3 className="text-base font-semibold text-slate-800">
          Click or drag & drop your bank statement CSV
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Supports statements from HDFC, ICICI, SBI, and standard CSV exports. Max 1MB (up to 500 rows).
        </p>

        {selectedFile && (
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-indigo-200 rounded-xl shadow-sm text-xs text-indigo-700 font-semibold">
            <FileText className="h-4 w-4" />
            <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Row & Sample CSV Link */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <a
          href="/sample_statement.csv"
          download="sample_statement.csv"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download sample statement CSV (41 rows)</span>
        </a>

        <Button
          variant="primary"
          size="md"
          onClick={handleUploadClick}
          disabled={!selectedFile || loading}
          loading={loading}
        >
          Upload & Preview Statement
        </Button>
      </div>
    </div>
  );
}

export default UploadDropzone;
