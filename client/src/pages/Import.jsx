import React, { useState } from 'react';
import importService from '../services/importService.js';
import UploadDropzone from '../components/import/UploadDropzone.jsx';
import ImportPreviewTable from '../components/import/ImportPreviewTable.jsx';
import ImportSummary from '../components/import/ImportSummary.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { Upload, Eye, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Upload File', icon: Upload },
  { id: 2, name: 'Review & Edit Categories', icon: Eye },
  { id: 3, name: 'Import Completed', icon: CheckCircle2 }
];

export function Import() {
  const [currentStep, setCurrentStep] = useState(1);
  const [previewData, setPreviewData] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Upload file and fetch preview
  const handleFileSelected = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const res = await importService.previewImport(file);
      setPreviewData(res.data);
      setCurrentStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to parse statement. Please ensure it is a valid CSV statement.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Commit verified rows to database
  const handleCommit = async (selectedRows) => {
    setLoading(true);
    setError(null);
    try {
      const res = await importService.commitImport(selectedRows);
      setCommitResult(res.data);
      setCurrentStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to commit transactions.');
    } finally {
      setLoading(false);
    }
  };

  // Reset wizard to upload another statement
  const handleReset = () => {
    setCurrentStep(1);
    setPreviewData(null);
    setCommitResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Statement Ingestion</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Bulk import bank statements, detect duplicates automatically, and train category memory
        </p>
      </div>

      {/* Step Indicator */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                      isDone
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : isCurrent
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`text-[11px] font-semibold text-center hidden sm:block ${
                      isCurrent ? 'text-indigo-600' : 'text-slate-500'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded transition-colors ${
                      currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Wizard Steps */}
      {currentStep === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm max-w-2xl mx-auto">
          <UploadDropzone onFileSelected={handleFileSelected} loading={loading} />
        </div>
      )}

      {currentStep === 2 && previewData && (
        <ImportPreviewTable
          previewData={previewData}
          onCommit={handleCommit}
          onCancel={handleReset}
          loading={loading}
        />
      )}

      {currentStep === 3 && commitResult && (
        <ImportSummary result={commitResult} onReset={handleReset} />
      )}
    </div>
  );
}

export default Import;

