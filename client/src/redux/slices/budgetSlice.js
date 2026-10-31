import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import budgetService from '../../services/budgetService.js';

export const fetchBudget = createAsyncThunk(
  'budget/fetchBudget',
  async (_, { rejectWithValue }) => {
    try {
      const data = await budgetService.getBudget();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch budget');
    }
  }
);

export const saveBudget = createAsyncThunk(
  'budget/saveBudget',
  async (budgetData, { rejectWithValue }) => {
    try {
      const data = await budgetService.setBudget(budgetData);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to save budget');
    }
  }
);

const budgetSlice = createSlice({
  name: 'budget',
  initialState: {
    monthlyBudget: 0,
    categoryBudgets: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudget.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.monthlyBudget = action.payload.monthlyBudget || 0;
          state.categoryBudgets = action.payload.categoryBudgets || [];
        }
      })
      .addCase(fetchBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Save
      .addCase(saveBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveBudget.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.monthlyBudget = action.payload.monthlyBudget || 0;
          state.categoryBudgets = action.payload.categoryBudgets || [];
        }
      })
      .addCase(saveBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default budgetSlice.reducer;
