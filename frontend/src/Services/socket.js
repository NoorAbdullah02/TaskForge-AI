import { io } from 'socket.io-client';

const isDev = import.meta.env.DEV;
const API_BASE = import.meta.env.VITE_API_BASE_URL || (isDev ? 'http://localhost:4000/api' : '/api');
// Extract host (e.g., http://localhost:4000) or use current origin in production
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
    : (isDev ? 'http://localhost:4000' : undefined);

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
 * Defers emit until connected if socket is still connecting.
 */
export const joinWorkspace = (workspaceId) => {
    if (!workspaceId) return;
    if (socket.connected) {
        socket.emit('joinWorkspace', workspaceId);
    } else {
        socket.once('connect', () => {
            socket.emit('joinWorkspace', workspaceId);
        });
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
