import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
// Extract host (e.g., http://localhost:4000)
const SOCKET_URL = API_BASE.replace('/api', '');

// Singleton socket — withCredentials sends httpOnly access token cookie automatically
export const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
});

// ─── Connection lifecycle ─────────────────────────────────────────────────────

socket.on('connect', () => {
    if (import.meta.env.DEV) {
        console.log(`[Socket] Connected: ${socket.id}`);
    }
});

socket.on('disconnect', (reason) => {
    if (import.meta.env.DEV) {
        console.warn(`[Socket] Disconnected: ${reason}`);
    }
});

socket.on('connect_error', (err) => {
    if (import.meta.env.DEV) {
        console.error(`[Socket] Connection error: ${err.message}`);
    }
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Connect and authenticate with the server.
 * The server validates the JWT cookie in its socket middleware.
 * We still emit 'auth' with userId as a secondary hint for room routing.
 * IMPORTANT: emit after 'connect' fires, not before.
 */
export const connectSocket = (userId) => {
    if (socket.connected) return;

    // Register one-time auth emit on first connect (avoids duplicate emits on reconnect)
    socket.once('connect', () => {
        socket.emit('auth', userId);
    });

    socket.connect();
};

/**
 * Join a workspace room for workspace-level real-time events.
 */
export const joinWorkspace = (workspaceId) => {
    if (socket.connected && workspaceId) {
        socket.emit('joinWorkspace', workspaceId);
    }
};

/**
 * Gracefully disconnect from the server.
 */
export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};
