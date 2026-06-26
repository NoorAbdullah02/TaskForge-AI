import api from './api';

export const getEvents = async () => {
    const response = await api.get('/calendar/events');
    return response.data;
};

export const scheduleMeeting = async (data) => {
    const response = await api.post('/calendar/meetings', data);
    return response.data;
};
