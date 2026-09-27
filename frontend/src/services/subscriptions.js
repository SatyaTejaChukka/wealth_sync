import api from '../lib/api';

const notifyChanges = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('subscriptions:changed'));
    window.dispatchEvent(new CustomEvent('transactions:changed'));
  }
};

export const subscriptionService = {
  getAll: async () => {
    const response = await api.get('/subscriptions/');
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/subscriptions/', data);
    notifyChanges();
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/subscriptions/${id}`, data);
    notifyChanges();
    return response.data;
  },

  delete: async (id, deleteTransactions = true) => {
    const response = await api.delete(`/subscriptions/${id}`, {
      params: { delete_transactions: deleteTransactions }
    });
    notifyChanges();
    return response.data;
  },

  logUsage: async (id, data) => {
    const response = await api.post(`/subscriptions/${id}/log-usage`, data);
    notifyChanges();
    return response.data;
  }
};
