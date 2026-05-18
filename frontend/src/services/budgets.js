import api from '../lib/api';

export const budgetService = {
  getSummary: async (month, year) => {
    const params = { month, year };
    const response = await api.get('/budgets/summary', { params });
    return response.data;
  },

  getRules: async () => {
    const response = await api.get('/budgets/rules');
    return response.data;
  },

  createRule: async (data) => {
    const response = await api.post('/budgets/rules', data);
    return response.data;
  },

  updateRule: async (id, data) => {
    const response = await api.put(`/budgets/rules/${id}`, data);
    return response.data;
  },

  deleteRule: async (id) => {
    const response = await api.delete(`/budgets/rules/${id}`);
    return response.data;
  }
};
