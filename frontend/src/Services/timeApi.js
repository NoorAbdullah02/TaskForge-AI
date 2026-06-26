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

export const stopTimer = async () => {
    const response = await api.post('/time/stop');
    return response.data;
};

export const createManualLog = async (data) => {
    const response = await api.post('/time/logs', data);
    return response.data;
};
