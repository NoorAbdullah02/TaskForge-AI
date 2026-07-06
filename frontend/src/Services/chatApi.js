import api from './api';

export const getRooms = async () => {
    const response = await api.get('/chat/rooms');
    return response.data;
};

export const createRoom = async (data) => {
    const response = await api.post('/chat/rooms', data);
    return response.data;
};

export const addRoomMembers = async (roomId, userIds) => {
    const response = await api.post(`/chat/rooms/${roomId}/members`, { userIds });
    return response.data;
};

export const getMessages = async (roomId) => {
    const response = await api.get(`/chat/rooms/${roomId}/messages`);
    return response.data;
};

export const sendMessage = async (roomId, content) => {
    const response = await api.post(`/chat/rooms/${roomId}/messages`, { content });
    return response.data;
};
