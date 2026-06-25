import api from './api';

export const getTodayStatus = async (params = {}) => {
    const response = await api.get('/attendance/today', { params });
    return response.data;
};

export const checkIn = async (data = {}) => {
    const response = await api.post('/attendance/check-in', data);
    return response.data;
};

export const checkOut = async (data = {}) => {
    const response = await api.post('/attendance/check-out', data);
    return response.data;
};

export const getAttendanceHistory = async () => {
    const response = await api.get('/attendance/history');
    return response.data;
};

export const getMonthlyReport = async (year, month) => {
    const response = await api.get('/attendance/report', {
        params: { year, month }
    });
    return response.data;
};
