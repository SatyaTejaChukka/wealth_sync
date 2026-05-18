import api from '../lib/api';

function notifyTransactionChange() {
  window.dispatchEvent(new CustomEvent('transactions:changed'));
}

function normalizeTransaction(transaction) {
  if (!transaction) {
    return transaction;
  }
  return {
    ...transaction,
    status: transaction.status || 'completed',
  };
}

export const transactionService = {
  getAll: async (params) => {
    const response = await api.get('/transactions/', { params });
    return Array.isArray(response.data)
      ? response.data.map(normalizeTransaction)
      : [];
  },
  
  create: async (data) => {
    const response = await api.post('/transactions/', data);
    notifyTransactionChange();
    return normalizeTransaction(response.data);
  },

  update: async (id, data) => {
    const response = await api.put(`/transactions/${id}`, data);
    notifyTransactionChange();
    return normalizeTransaction(response.data);
  },

  delete: async (id) => {
    const response = await api.delete(`/transactions/${id}`);
    notifyTransactionChange();
    return normalizeTransaction(response.data);
  },

  complete: async (id) => {
    const response = await api.post(`/transactions/${id}/complete`);
    notifyTransactionChange();
    return normalizeTransaction(response.data);
  }
};
