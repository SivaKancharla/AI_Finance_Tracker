import { createSlice } from '@reduxjs/toolkit';

let nextToastId = 1;

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    toasts: []
  },
  reducers: {
    addToast: {
      reducer: (state, action) => {
        state.toasts.push(action.payload);
      },
      prepare: ({ message, type = 'info', duration = 4000 }) => ({
        payload: {
          id: nextToastId++,
          message,
          type, // 'success' | 'error' | 'warning' | 'info'
          duration
        }
      })
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    }
  }
});

export const { addToast, removeToast } = uiSlice.actions;
export default uiSlice.reducer;
