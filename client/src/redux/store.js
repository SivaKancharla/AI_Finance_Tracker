import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import metaReducer from './slices/metaSlice.js';
import transactionReducer from './slices/transactionSlice.js';
import budgetReducer from './slices/budgetSlice.js';
import insightsReducer from './slices/insightsSlice.js';
import uiReducer from './slices/uiSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    meta: metaReducer,
    transactions: transactionReducer,
    budget: budgetReducer,
    insights: insightsReducer,
    ui: uiReducer
  }
});

export default store;
