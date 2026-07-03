import api from '../lib/api';

export const loanService = {
  getAll: async (status) => {
    const response = await api.get('/loans/', {
      params: status ? { status } : {}
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/loans/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/loans/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/loans/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/loans/${id}`);
    return response.data;
  },

  calculate: async (data) => {
    const response = await api.post('/loans/calculate', data);
    return response.data;
  },

  payEMI: async (id) => {
    const response = await api.post(`/loans/${id}/pay`);
    return response.data;
  }
};
