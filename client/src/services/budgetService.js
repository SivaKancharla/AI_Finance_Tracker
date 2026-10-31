import api from './api.js';

export const budgetService = {
  getBudget: async () => {
    const res = await api.get('/budget');
    return res.data;
  },

  setBudget: async (budgetData) => {
    const res = await api.post('/budget', budgetData);
    return res.data;
  },

  updateBudget: async (budgetData) => {
    const res = await api.put('/budget', budgetData);
    return res.data;
  }
};

export default budgetService;
