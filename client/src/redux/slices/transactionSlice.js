import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import transactionService from '../../services/transactionService.js';

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (params, { getState, rejectWithValue }) => {
    try {
      const state = getState().transactions;
      const queryParams = { ...state.filters, ...params };
      // Remove empty keys
      Object.keys(queryParams).forEach((k) => {
        if (queryParams[k] === '' || queryParams[k] === null || queryParams[k] === undefined) {
          delete queryParams[k];
        }
      });
      const data = await transactionService.getTransactions(queryParams);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const saveTransaction = createAsyncThunk(
  'transactions/saveTransaction',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      if (id) {
        const res = await transactionService.updateTransaction(id, data);
        return { isEdit: true, transaction: res.data };
      } else {
        const res = await transactionService.createTransaction(data);
        return { isEdit: false, transaction: res.data };
      }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to save transaction');
    }
  }
);

export const removeTransaction = createAsyncThunk(
  'transactions/removeTransaction',
  async (id, { rejectWithValue }) => {
    try {
      await transactionService.deleteTransaction(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete transaction');
    }
  }
);

const initialFilters = {
  search: '',
  type: '',
  category: '',
  startDate: '',
  endDate: '',
  sort: 'latest',
  page: 1,
  limit: 10
};

const transactionSlice = createSlice({
  name: 'transactions',
  initialState: {
    items: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1
    },
    filters: initialFilters,
    loading: false,
    error: null
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialFilters;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || [];
        state.pagination = action.payload.pagination || state.pagination;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Save
      .addCase(saveTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveTransaction.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.transaction) {
          const txn = action.payload.transaction;
          if (action.payload.isEdit) {
            state.items = state.items.map((item) => (item._id === txn._id ? txn : item));
          } else {
            // Prepend new transaction so it appears immediately at the top
            state.items = [txn, ...state.items];
            state.pagination.total = (state.pagination.total || 0) + 1;
          }
        }
      })
      .addCase(saveTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete
      .addCase(removeTransaction.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeTransaction.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item._id !== action.payload);
      })
      .addCase(removeTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { setFilters, resetFilters } = transactionSlice.actions;
export default transactionSlice.reducer;
