import api from './api';

export const emailReport = async (reportData) => {
    const response = await api.post('/reports/email', reportData);
    return response.data;
};
