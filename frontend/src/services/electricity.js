import api from '../lib/api';

export const electricityService = {
  getProviders: async () => {
    const response = await api.get('/electricity/providers');
    return response.data;
  },

  previewBill: async (providerCode, consumerNumber, mobile = null) => {
    const response = await api.post('/electricity/preview', null, {
      params: {
        provider_code: providerCode,
        consumer_number: consumerNumber,
        mobile: mobile || undefined,
      },
    });
    return response.data;
  },

  getAccounts: async () => {
    const response = await api.get('/electricity/accounts');
    return response.data;
  },

  createAccount: async (data) => {
    const response = await api.post('/electricity/accounts', data);
    return response.data;
  },

  getAccount: async (id) => {
    const response = await api.get(`/electricity/accounts/${id}`);
    return response.data;
  },

  updateAccount: async (id, data) => {
    const response = await api.put(`/electricity/accounts/${id}`, data);
    return response.data;
  },

  deleteAccount: async (id) => {
    const response = await api.delete(`/electricity/accounts/${id}`);
    return response.data;
  },

  fetchBill: async (id) => {
    const response = await api.post(`/electricity/accounts/${id}/fetch`);
    return response.data;
  },

  payBill: async (billId, data = {}) => {
    const response = await api.post(`/electricity/bills/${billId}/pay`, data);
    return response.data;
  },
};
