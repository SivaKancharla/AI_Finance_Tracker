import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import metaService from '../../services/metaService.js';

const FALLBACK_EXPENSE_CATEGORIES = [
  'Food', 'Rent', 'Transport', 'Shopping', 'Entertainment',
  'Bills', 'Healthcare', 'Education', 'Investments', 'Other'
];

const FALLBACK_INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Gift', 'Other'];
const FALLBACK_PAYMENT_METHODS = ['upi', 'cash', 'card', 'netbanking', 'other'];

export const fetchMeta = createAsyncThunk(
  'meta/fetchMeta',
  async (_, { rejectWithValue }) => {
    try {
      const data = await metaService.getMeta();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch metadata');
    }
  }
);

const metaSlice = createSlice({
  name: 'meta',
  initialState: {
    expenseCategories: FALLBACK_EXPENSE_CATEGORIES,
    incomeCategories: FALLBACK_INCOME_CATEGORIES,
    paymentMethods: FALLBACK_PAYMENT_METHODS,
    loaded: false,
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMeta.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMeta.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        if (action.payload) {
          state.expenseCategories = action.payload.expenseCategories || FALLBACK_EXPENSE_CATEGORIES;
          state.incomeCategories = action.payload.incomeCategories || FALLBACK_INCOME_CATEGORIES;
          state.paymentMethods = action.payload.paymentMethods || FALLBACK_PAYMENT_METHODS;
        }
      })
      .addCase(fetchMeta.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true; // Use fallbacks gracefully
        state.error = action.payload;
      });
  }
});

export default metaSlice.reducer;
