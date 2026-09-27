import api from '../lib/api';

const notifyChanges = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bills:changed'));
    window.dispatchEvent(new CustomEvent('transactions:changed'));
  }
};

export const billService = {
  getAll: async () => {
    const response = await api.get('/bills/');
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/bills/', data);
    notifyChanges();
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/bills/${id}`, data);
    notifyChanges();
    return response.data;
  },

  delete: async (id, deleteTransactions = true) => {
    const response = await api.delete(`/bills/${id}`, {
      params: { delete_transactions: deleteTransactions }
    });
    notifyChanges();
    return response.data;
  },

  markPaid: async (id) => {
    const response = await api.post(`/bills/${id}/mark-paid`);
    notifyChanges();
    return response.data;
  },

  markUnpaid: async (id) => {
    const response = await api.post(`/bills/${id}/mark-unpaid`);
    notifyChanges();
    return response.data;
  }
};
