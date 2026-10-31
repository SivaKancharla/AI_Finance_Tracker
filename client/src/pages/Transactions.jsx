import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  fetchTransactions,
  saveTransaction,
  removeTransaction,
  setFilters,
  resetFilters
} from '../redux/slices/transactionSlice.js';
import { addToast } from '../redux/slices/uiSlice.js';
import FiltersBar from '../components/transactions/FiltersBar.jsx';
import TransactionTable from '../components/transactions/TransactionTable.jsx';
import TransactionForm from '../components/transactions/TransactionForm.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Pagination from '../components/common/Pagination.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Button from '../components/common/Button.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { Plus, FileSpreadsheet, Receipt } from 'lucide-react';
import useDebounce from '../hooks/useDebounce.js';

export function Transactions() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { items, pagination, filters, loading, error } = useSelector((state) => state.transactions);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Debounced search term
  const debouncedSearch = useDebounce(filters.search, 400);

  // Sync filters from URL search params on mount
  useEffect(() => {
    const paramsObj = {};
    if (searchParams.get('search')) paramsObj.search = searchParams.get('search');
    if (searchParams.get('type')) paramsObj.type = searchParams.get('type');
    if (searchParams.get('category')) paramsObj.category = searchParams.get('category');
    if (searchParams.get('sort')) paramsObj.sort = searchParams.get('sort');
    if (searchParams.get('page')) paramsObj.page = Number(searchParams.get('page'));

    if (Object.keys(paramsObj).length > 0) {
      dispatch(setFilters(paramsObj));
    }

    if (searchParams.get('action') === 'new') {
      setIsFormOpen(true);
      setEditingTransaction(null);
    }
  }, []);

  // Update URL query parameters when filters change
  const updateUrlParams = (newFilters) => {
    const nextParams = new URLSearchParams();
    if (newFilters.search) nextParams.set('search', newFilters.search);
    if (newFilters.type) nextParams.set('type', newFilters.type);
    if (newFilters.category) nextParams.set('category', newFilters.category);
    if (newFilters.sort) nextParams.set('sort', newFilters.sort);
    if (newFilters.page && newFilters.page > 1) nextParams.set('page', String(newFilters.page));
    setSearchParams(nextParams, { replace: true });
  };

  // Fetch transactions whenever debounced search or filters change
  useEffect(() => {
    dispatch(fetchTransactions({ search: debouncedSearch }));
  }, [debouncedSearch, filters.type, filters.category, filters.sort, filters.page, dispatch]);

  const handleFilterChange = (updates) => {
    const merged = { ...filters, ...updates };
    dispatch(setFilters(updates));
    updateUrlParams(merged);
  };

  const handleResetFilters = () => {
    dispatch(resetFilters());
    setSearchParams({}, { replace: true });
  };

  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (txn) => {
    setEditingTransaction(txn);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
    // Remove ?action=new if present
    if (searchParams.get('action')) {
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  };

  const handleSaveTransaction = async (formData) => {
    setIsSaving(true);
    try {
      const res = await dispatch(
        saveTransaction({
          id: editingTransaction?._id,
          data: formData
        })
      ).unwrap();

      const savedTxn = res.transaction;
      const sourceLabel =
        savedTxn.categorySource === 'memory'
          ? 'Learned Memory'
          : savedTxn.categorySource === 'llm'
          ? 'AI'
          : 'Rule';

      dispatch(
        addToast({
          type: 'success',
          message: editingTransaction
            ? `Updated: ${savedTxn.title} (${savedTxn.category})`
            : `Saved: ${savedTxn.title} categorized as ${savedTxn.category} via ${sourceLabel}`
        })
      );

      handleCloseForm();
      // Refetch current list
      dispatch(fetchTransactions());
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: String(err) || 'Failed to save transaction'
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await dispatch(removeTransaction(deletingId)).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: 'Transaction deleted successfully'
        })
      );
      setDeletingId(null);
      dispatch(fetchTransactions());
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          message: String(err) || 'Failed to delete transaction'
        })
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Transactions Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, filter, and review all your income and expenses
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="primary" size="md" onClick={handleOpenAdd} icon={Plus}>
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <FiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      <ErrorBanner message={error} onRetry={() => dispatch(fetchTransactions())} />

      {/* Transactions List or Empty State */}
      {items.length > 0 ? (
        <div className="space-y-4">
          <TransactionTable
            transactions={items}
            onEdit={handleOpenEdit}
            onDelete={(t) => setDeletingId(t._id)}
            onReview={handleOpenEdit}
          />

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(p) => handleFilterChange({ page: p })}
          />
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-3 text-xs text-slate-500">Loading transactions...</p>
        </div>
      ) : (
        <EmptyState
          icon={Receipt}
          title="No transactions found"
          description="Try adjusting your search filters, or record a new transaction to start tracking."
          actionText="Add Transaction"
          onAction={handleOpenAdd}
          secondaryActionText="Import Statement CSV"
          onSecondaryAction={() => (window.location.href = '/import')}
        />
      )}

      {/* Add / Edit Transaction Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={editingTransaction ? 'Edit Transaction' : 'Record New Transaction'}
        maxWidth="max-w-md"
      >
        <TransactionForm
          initialData={editingTransaction}
          onSave={handleSaveTransaction}
          onCancel={handleCloseForm}
          loading={isSaving}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        message="Are you sure you want to permanently delete this transaction? This action cannot be undone."
        confirmText="Delete"
        loading={isDeleting}
      />
    </div>
  );
}

export default Transactions;

