import api from './api';

export const submitWorkLog = async (data) => {
    const response = await api.post('/worklogs', data);
    return response.data;
};

export const updateWorkLog = async (id, data) => {
    const response = await api.put(`/worklogs/${id}`, data);
    return response.data;
};

export const getMyWorkLogs = async (params = {}) => {
    const response = await api.get('/worklogs/mine', { params });
    return response.data;
};

export const getWorkLogDetails = async (id) => {
    const response = await api.get(`/worklogs/${id}`);
    return response.data;
};

export const getTeamWorkLogs = async (params = {}) => {
    const response = await api.get('/worklogs/team/list', { params });
    return response.data;
};

export const getWorkLogAnalytics = async (params = {}) => {
    const response = await api.get('/worklogs/team/analytics', { params });
    return response.data;
};

export const approveWorkLog = async (id, note) => {
    const response = await api.post(`/worklogs/${id}/approve`, { note });
    return response.data;
};

export const rejectWorkLog = async (id, note) => {
    const response = await api.post(`/worklogs/${id}/reject`, { note });
    return response.data;
};

export const requestWorkLogChanges = async (id, note) => {
    const response = await api.post(`/worklogs/${id}/request-changes`, { note });
    return response.data;
};

export const bulkApproveWorkLogs = async (workLogIds) => {
    const response = await api.post('/worklogs/bulk-approve', { workLogIds });
    return response.data;
};
