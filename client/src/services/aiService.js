import api from './api.js';

export const aiService = {
  categorize: async (body, options = {}) => {
    const res = await api.post('/ai/categorize', body, options);
    return res.data;
  },

  optimizeBudget: async () => {
    const res = await api.post('/ai/budget-optimize');
    return res.data;
  },

  generateInsights: async (force = false, month = null) => {
    const params = {};
    if (force) params.force = 1;
    if (month) params.month = month;
    const res = await api.post('/ai/insights', {}, { params });
    return res.data;
  },

  predictSpending: async () => {
    const res = await api.post('/ai/predict');
    return res.data;
  },

  getAiStats: async () => {
    const res = await api.get('/ai/stats');
    return res.data;
  }
};

export default aiService;
