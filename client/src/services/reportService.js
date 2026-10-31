import api from './api.js';

export const reportService = {
  getMonthlyReport: async (params = {}) => {
    const res = await api.get('/reports/monthly', { params });
    return res.data;
  },

  downloadMonthlyReport: async (params = {}) => {
    const res = await api.get('/reports/monthly', {
      params: { ...params, format: 'pdf' },
      responseType: 'blob'
    });
    return res.data;
  }
};

export default reportService;
