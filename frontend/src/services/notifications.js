import api from '../lib/api';

export const notificationService = {
  getNotifications: async (unreadOnly = false) => {
    const params = unreadOnly ? { unread_only: true } : {};
    const response = await api.get('/notifications/', { params });
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/mark-read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.post('/notifications/mark-all-read');
    return response.data;
  },

  deleteNotification: async (notificationId) => {
    await api.delete(`/notifications/${notificationId}`);
  }
};
