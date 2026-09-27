import api from '../lib/api';

const notifyChanges = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('loans:changed'));
    window.dispatchEvent(new CustomEvent('transactions:changed'));
  }
};

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
    notifyChanges();
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/loans/${id}`, data);
    notifyChanges();
    return response.data;
  },

  delete: async (id, deleteTransactions = true) => {
    const response = await api.delete(`/loans/${id}`, {
      params: { delete_transactions: deleteTransactions }
    });
    notifyChanges();
    return response.data;
  },

  calculate: async (data) => {
    const response = await api.post('/loans/calculate', data);
    return response.data;
  },

  payEMI: async (id) => {
    const response = await api.post(`/loans/${id}/pay`);
    notifyChanges();
    return response.data;
  }
};
