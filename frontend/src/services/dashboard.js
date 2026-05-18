import api from '../lib/api';

export const dashboardService = {
  getSummary: async (range = 'week') => {
    const response = await api.get('/dashboard/summary', {
      params: { chart_range: range },
    });
    return response.data;
  },

  getTriage: async () => {
    const response = await api.get('/dashboard/triage');
    return response.data;
  },
};
