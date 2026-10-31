import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import aiService from '../../services/aiService.js';

export const fetchInsights = createAsyncThunk(
  'insights/fetchInsights',
  async ({ force = false, month = null } = {}, { rejectWithValue }) => {
    try {
      const data = await aiService.generateInsights(force, month);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch insights');
    }
  }
);

export const fetchForecast = createAsyncThunk(
  'insights/fetchForecast',
  async (_, { rejectWithValue }) => {
    try {
      const data = await aiService.predictSpending();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch forecast');
    }
  }
);

export const fetchAiStats = createAsyncThunk(
  'insights/fetchAiStats',
  async (_, { rejectWithValue }) => {
    try {
      const data = await aiService.getAiStats();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch AI stats');
    }
  }
);

const insightsSlice = createSlice({
  name: 'insights',
  initialState: {
    insights: [],
    provider: 'heuristic',
    forecast: null,
    stats: null,
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Insights
      .addCase(fetchInsights.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInsights.fulfilled, (state, action) => {
        state.loading = false;
        state.insights = action.payload?.insights || [];
        state.provider = action.payload?.provider || 'heuristic';
      })
      .addCase(fetchInsights.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Forecast
      .addCase(fetchForecast.fulfilled, (state, action) => {
        state.forecast = action.payload;
      })

      // Stats
      .addCase(fetchAiStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  }
});

export default insightsSlice.reducer;
