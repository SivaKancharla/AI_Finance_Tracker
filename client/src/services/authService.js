import api from './api.js';

export const authService = {
  signup: async (userData) => {
    const res = await api.post('/auth/signup', userData);
    return res.data;
  },

  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  updateProfile: async (profileData) => {
    const res = await api.put('/auth/profile', profileData);
    return res.data;
  },

  changePassword: async (passwordData) => {
    const res = await api.put('/auth/password', passwordData);
    return res.data;
  },

  getAccountStats: async () => {
    const res = await api.get('/auth/stats');
    return res.data;
  }
};

export default authService;
