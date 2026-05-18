import api from '../lib/api';

export const healthService = {
  getScore: async () => {
    const response = await api.get('/health/score');
    return response.data;
  },
};
