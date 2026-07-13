import api from './api';

export const getLogs = async () => {
    const response = await api.get('/time/logs');
    return response.data;
};

export const getActiveTimer = async () => {
    const response = await api.get('/time/active');
    return response.data;
};

export const startTimer = async (description, taskId) => {
    const response = await api.post('/time/start', { description, taskId });
    return response.data;
};

export const pauseTimer = async () => {
    const response = await api.post('/time/pause');
    return response.data;
};

export const resumeTimer = async () => {
    const response = await api.post('/time/resume');
    return response.data;
};

export const stopTimer = async () => {
    const response = await api.post('/time/stop');
    return response.data;
};

export const restartTimer = async (logId) => {
    const response = await api.post(`/time/restart/${logId}`);
    return response.data;
};

export const createManualLog = async (data) => {
    const response = await api.post('/time/logs', data);
    return response.data;
};

export const getMyHoursSummary = async () => {
    const response = await api.get('/time/hours/me');
    return response.data;
};

export const getWorkspaceHours = async () => {
    const response = await api.get('/time/hours/workspace');
    return response.data;
};

export const getProjectHours = async () => {
    const response = await api.get('/time/hours/projects');
    return response.data;
};
