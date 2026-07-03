import api from '../lib/api';

export const lentService = {
  getAll: async (status) => {
    const response = await api.get('/lent/', {
      params: status ? { status } : {}
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/lent/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/lent/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/lent/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/lent/${id}`);
    return response.data;
  },

  repay: async (id, amount, notes) => {
    const response = await api.post(`/lent/${id}/repay`, null, {
      params: {
        amount,
        ...(notes ? { notes } : {})
      }
    });
    return response.data;
  }
};
export default lentService;
