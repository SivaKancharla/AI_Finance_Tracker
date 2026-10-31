import api from './api.js';

export const dashboardService = {
  getDashboardSummary: async (month) => {
    const params = month ? { month } : {};
    const res = await api.get('/dashboard/summary', { params });
    return res.data;
  }
};

export default dashboardService;
