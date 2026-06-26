import { Server } from 'socket.io';
import { db } from '../db/index';
import { notifications } from '../db/schema';

class SocketService {
    private io: Server | null = null;
    private userSockets = new Map<number, string>(); // userId -> socketId

    init(server: any) {
        this.io = new Server(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                credentials: true
            }
        });

        this.io.on('connection', (socket) => {
            console.log('⚡ Socket connected:', socket.id);

            socket.on('auth', (userId: number) => {
                if (userId) {
                    this.userSockets.set(userId, socket.id);
                    socket.join(`user_${userId}`);
                    console.log(`👤 User authenticated on socket: User ID ${userId} -> Socket ID ${socket.id}`);
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
                for (const [userId, socketId] of this.userSockets.entries()) {
                    if (socketId === socket.id) {
                        this.userSockets.delete(userId);
                        console.log(`❌ Removed user authentication: User ID ${userId}`);
                        break;
                    }
                }
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
