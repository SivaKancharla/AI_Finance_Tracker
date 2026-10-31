import api from './api.js';

export const importService = {
  previewImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post('/transactions/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  commitImport: async (rows) => {
    const res = await api.post('/transactions/import/commit', {
      transactions: rows
    });
    return res.data;
  }
};

export default importService;
