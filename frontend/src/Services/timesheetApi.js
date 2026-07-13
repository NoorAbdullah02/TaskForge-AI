import api from './api';

export const generateTimesheet = async (periodType, periodStart) => {
    const response = await api.post('/timesheets/generate', { periodType, periodStart });
    return response.data;
};

export const getMyTimesheets = async (params = {}) => {
    const response = await api.get('/timesheets/mine', { params });
    return response.data;
};

export const getTeamTimesheets = async (params = {}) => {
    const response = await api.get('/timesheets/team/list', { params });
    return response.data;
};

export const getTimesheetDetails = async (id) => {
    const response = await api.get(`/timesheets/${id}`);
    return response.data;
};

export const submitTimesheet = async (id) => {
    const response = await api.post(`/timesheets/${id}/submit`);
    return response.data;
};

export const approveTimesheet = async (id, note) => {
    const response = await api.post(`/timesheets/${id}/approve`, { note });
    return response.data;
};

export const rejectTimesheet = async (id, note) => {
    const response = await api.post(`/timesheets/${id}/reject`, { note });
    return response.data;
};

export const setTimesheetLock = async (id, isLocked) => {
    const response = await api.post(`/timesheets/${id}/lock`, { isLocked });
    return response.data;
};

export const downloadTimesheetPdf = async (id) => {
    const response = await api.get(`/timesheets/${id}/pdf`, { responseType: 'blob' });
    return response.data;
};

export const downloadTimesheetExcel = async (id) => {
    const response = await api.get(`/timesheets/${id}/excel`, { responseType: 'blob' });
    return response.data;
};
