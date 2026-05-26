import api from '../lib/api';

export const incomeService = {
  getIncomes: async () => {
    const response = await api.get('/income/');
    return response.data;
  },

  createIncome: async (data) => {
    const response = await api.post('/income/', data);
    return response.data;
  },

  updateIncome: async (id, data) => {
    const response = await api.put(`/income/${id}`, data);
    return response.data;
  },

  deleteIncome: async (id) => {
    const response = await api.delete(`/income/${id}`);
    return response.data;
  }
};
