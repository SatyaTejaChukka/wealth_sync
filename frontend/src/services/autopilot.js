import api from '../lib/api';

export const autopilotService = {
  getDailySafeToSpend: async () => {
    const response = await api.get('/autopilot/safe-to-spend-daily');
    return response.data;
  },

  getTimeline: async (daysPast = 7, daysFuture = 30) => {
    const response = await api.get('/autopilot/timeline', {
      params: {
        days_past: daysPast,
        days_future: daysFuture,
      },
    });
    return response.data;
  },

  listPayments: async (status, limit = 100) => {
    const params = { limit };
    if (status) {
      params.status = status;
    }

    const response = await api.get('/autopilot/payments', {
      params,
    });
    return response.data;
  },

  preparePayments: async (daysAhead = 7) => {
    const response = await api.post('/autopilot/payments/prepare', null, {
      params: { days_ahead: daysAhead },
    });
    return response.data;
  },

  approvePayment: async (paymentId, executeNow = true) => {
    const response = await api.post(`/autopilot/payments/${paymentId}/approve`, {
      execute_now: executeNow,
    });
    return response.data;
  },

  executePayment: async (paymentId) => {
    const response = await api.post(`/autopilot/payments/${paymentId}/execute`);
    return response.data;
  },

  executeDuePayments: async () => {
    const response = await api.post('/autopilot/payments/execute-due');
    return response.data;
  },

  cancelPayment: async (paymentId, reason) => {
    const response = await api.post(`/autopilot/payments/${paymentId}/cancel`, { reason });
    return response.data;
  },

  getSalaryRuleEngine: async (salaryOverride, freeMoneyMinPercent) => {
    const params = {};

    if (salaryOverride !== undefined && salaryOverride !== null) {
      params.salary_override = salaryOverride;
    }
    if (freeMoneyMinPercent !== undefined && freeMoneyMinPercent !== null) {
      params.free_money_min_percent = freeMoneyMinPercent;
    }

    const response = await api.get('/autopilot/salary-rule-engine', { params });
    return response.data;
  },
};
