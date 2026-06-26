import api from './api';

/**
 * Translate the UI filter tab into backend query params.
 *   'all'      → { isArchived: false }         (active, both read and unread)
 *   'unread'   → { isRead: false, isArchived: false }
 *   'archived' → { isArchived: true }
 */
const statusToParams = (status) => {
  switch (status) {
    case 'unread':
      return { isRead: false, isArchived: false };
    case 'archived':
      return { isArchived: true };
    default: // 'all'
      return { isArchived: false };
  }
};

export const getNotifications = async (params = {}) => {
  const { status, ...rest } = params;
  const translated = status ? statusToParams(status) : {};
  const response = await api.get('/notifications', { params: { ...translated, ...rest } });
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data;
};

export const archiveNotification = async (id) => {
  const response = await api.patch(`/notifications/${id}/archive`);
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

export const clearAllNotifications = async () => {
  const response = await api.delete('/notifications/clear-all');
  return response.data;
};

export const getNotificationPreferences = async () => {
  const response = await api.get('/notifications/preferences');
  return response.data;
};

export const updateNotificationPreferences = async (preferences) => {
  const response = await api.patch('/notifications/preferences', preferences);
  return response.data;
};

export const getEmailLogs = async (params = {}) => {
  const response = await api.get('/notifications/email-logs', { params });
  return response.data;
};

export const retryEmailLog = async (id) => {
  const response = await api.patch(`/notifications/email-logs/${id}/retry`);
  return response.data;
};

export const getAutomationLogs = async (params = {}) => {
  const response = await api.get('/notifications/automation-logs', { params });
  return response.data;
};
