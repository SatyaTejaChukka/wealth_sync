import api from '../lib/api';

export const calendarService = {
  getEvents: async (year, month) => {
    const response = await api.get('/calendar/events', {
      params: { year, month }
    });
    return response.data;
  }
};
