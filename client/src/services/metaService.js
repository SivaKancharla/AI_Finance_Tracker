import api from './api.js';

export const metaService = {
  getMeta: async () => {
    const res = await api.get('/meta');
    return res.data;
  }
};

export default metaService;
