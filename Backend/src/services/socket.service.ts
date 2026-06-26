import { Server } from 'socket.io';
import { db } from '../db/index';
import { notifications } from '../db/schema';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const parseCookies = (cookieString: string) => {
    const list: Record<string, string> = {};
    if (!cookieString) return list;
    cookieString.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        list[parts.shift()!.trim()] = decodeURI(parts.join('='));
    });
    return list;
};

class SocketService {
    private io: Server | null = null;
    private userSockets = new Map<number, string>(); // userId -> socketId

    init(server: any) {
        this.io = new Server(server, {
            cors: {
                origin: env.FRONTEND_URL || 'http://localhost:5173',
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                credentials: true
            }
        });

        // Add Socket.IO JWT authentication middleware
        this.io.use((socket, next) => {
            try {
                const cookieHeader = socket.handshake.headers.cookie;
                let token: string | undefined = undefined;

                if (cookieHeader) {
                    const cookies = parseCookies(cookieHeader);
                    token = cookies.accessToken;
                }

                // Fallback to auth header or query param for flexibility
                if (!token && socket.handshake.headers.authorization) {
                    const authHeader = socket.handshake.headers.authorization;
                    if (authHeader.startsWith('Bearer ')) {
                        token = authHeader.slice(7);
                    }
                }

                if (!token && socket.handshake.query?.token) {
                    token = socket.handshake.query.token as string;
                }

                if (!token) {
                    return next(new Error('Authentication error: Access token missing'));
                }

                const decoded = jwt.verify(token, env.JWT_SECRET) as any;
                (socket as any).user = decoded;
                next();
            } catch (err) {
                return next(new Error('Authentication error: Invalid access token'));
            }
        });

        this.io.on('connection', (socket) => {
            const user = (socket as any).user;
            if (!user || !user.id) {
                console.log('🔌 Socket connection rejected: Unauthenticated');
                socket.disconnect();
                return;
            }

            const userId = Number(user.id);
            this.userSockets.set(userId, socket.id);
            socket.join(`user_${userId}`);
            console.log(`⚡ Socket connected & verified: User ID ${userId} -> Socket ID ${socket.id}`);

            socket.on('auth', (clientUserId: number) => {
                console.log(`👤 Client auth request for user ID: ${clientUserId} (Verified ID: ${userId})`);
                if (Number(clientUserId) !== userId) {
                    console.warn(`⚠️ Impersonation attempt blocked: User ${userId} tried to auth as ${clientUserId}`);
                }
            });

            socket.on('join_workspace', (workspaceId: number) => {
                 if (workspaceId) {
                    socket.join(`workspace_${workspaceId}`);
                    console.log(`💼 Socket ${socket.id} joined Workspace Room workspace_${workspaceId}`);
                }
            });

            socket.on('join_chat', (chatId: number) => {
                if (chatId) {
                    socket.join(`chat_${chatId}`);
                    console.log(`💬 Socket ${socket.id} joined Chat Room chat_${chatId}`);
                }
            });

            socket.on('leave_chat', (chatId: number) => {
                if (chatId) {
                    socket.leave(`chat_${chatId}`);
                    console.log(`💬 Socket ${socket.id} left Chat Room chat_${chatId}`);
                }
            });

            socket.on('disconnect', () => {
                console.log('🔌 Socket disconnected:', socket.id);
                this.userSockets.delete(userId);
            });
        });
    }

    // Send real-time notification, save to DB, and emit to socket room
    async sendNotification(userId: number, title: string, message: string, type: string) {
        try {
            // 1. Save to DB
            const [notif] = await db.insert(notifications).values({
                userId,
                title,
                message,
                type,
                isRead: false,
                createdAt: new Date()
            }).returning();

            // 2. Emit real-time socket event if user is active
            if (this.io) {
                this.io.to(`user_${userId}`).emit('notification', notif);
                console.log(`🔔 Emitted real-time notification to user_${userId}: "${title}"`);
            }
            return notif;
        } catch (err) {
            console.error('Error sending/saving notification:', err);
        }
    }

    emitToUser(userId: number, event: string, data: any) {
        if (this.io) {
            this.io.to(`user_${userId}`).emit(event, data);
            console.log(`⚡ Emitted "${event}" to user_${userId}`);
        }
    }

    // Broadcast a general event to a workspace room
    broadcastToWorkspace(workspaceId: number, event: string, data: any) {
        if (this.io) {
            this.io.to(`workspace_${workspaceId}`).emit(event, data);
            console.log(`📢 Broadcasted "${event}" to workspace_${workspaceId}`);
        }
    }

    // Broadcast message to a chat room
    broadcastToChat(chatId: number, event: string, data: any) {
        if (this.io) {
            this.io.to(`chat_${chatId}`).emit(event, data);
            console.log(`💬 Broadcasted "${event}" to chat_${chatId}`);
        }
    }
}

export const socketService = new SocketService();
export default socketService;
