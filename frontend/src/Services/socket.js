import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
// Extract host (e.g., http://localhost:4000)
const SOCKET_URL = API_BASE.replace('/api', '');

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true
});

export const connectSocket = (userId) => {
    if (!socket.connected) {
        socket.connect();
        socket.emit('auth', userId);
        console.log(`🔌 Socket connecting for user: ${userId}`);
    }
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
        console.log('🔌 Socket disconnected');
    }
};
