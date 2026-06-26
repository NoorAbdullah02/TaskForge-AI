import { Request, Response } from 'express';
import { db } from '../db/index';
import { chats, chatMembers, messages, users } from '../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { socketService } from '../services/socket.service';

export class ChatController {
    // 1. Get user's chat rooms in active workspace
    static async getRooms(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            // Fetch rooms where user is a member
            const memberRooms = await db.select({ chatId: chatMembers.chatId })
                .from(chatMembers)
                .where(eq(chatMembers.userId, user.id));
            
            const chatIds = memberRooms.map(r => r.chatId);
            if (chatIds.length === 0) {
                return res.status(200).json([]);
            }

            // Get chat rooms info
            const roomsList = await db.select()
                .from(chats)
                .where(
                    and(
                        eq(chats.workspaceId, activeWorkspaceId),
                        inArray(chats.id, chatIds)
                    )
                );

            // Fetch member names and other info for DMs
            const enrichedRooms = [];
            for (const r of roomsList) {
                const roomMembers = await db.select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    avatarUrl: users.avatarUrl
                })
                .from(chatMembers)
                .innerJoin(users, eq(chatMembers.userId, users.id))
                .where(eq(chatMembers.chatId, r.id));

                let displayName = r.name || 'Chat Group';
                if (r.type === 'direct') {
                    const otherMember = roomMembers.find(m => m.id !== user.id);
                    displayName = otherMember ? otherMember.name : 'Saved Messages';
                }

                // Get last message
                const [lastMsg] = await db.select({
                    content: messages.content,
                    createdAt: messages.createdAt,
                    senderName: users.name
                })
                .from(messages)
                .leftJoin(users, eq(messages.senderId, users.id))
                .where(eq(messages.chatId, r.id))
                .orderBy(sql`${messages.createdAt} desc`)
                .limit(1);

                enrichedRooms.push({
                    ...r,
                    name: displayName,
                    members: roomMembers,
                    lastMessage: lastMsg || null
                });
            }

            return res.status(200).json(enrichedRooms);
        } catch (error) {
            console.error('Error in getRooms:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 2. Create a new chat room (DM or Group)
    static async createRoom(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const { name, type, projectId, userIds } = req.body; // userIds is array of target userIds

            // Check if DM already exists between these two users
            if (type === 'direct' && userIds && userIds.length === 1) {
                const targetUserId = userIds[0];
                
                const existingDMs = await db.select({ chatId: chats.id })
                    .from(chats)
                    .innerJoin(chatMembers, eq(chats.id, chatMembers.chatId))
                    .where(
                        and(
                            eq(chats.workspaceId, activeWorkspaceId),
                            eq(chats.type, 'direct')
                        )
                    );

                const existingChatIds = existingDMs.map(d => d.chatId);
                if (existingChatIds.length > 0) {
                    for (const cid of existingChatIds) {
                        const members = await db.select().from(chatMembers).where(eq(chatMembers.chatId, cid));
                        const mIds = members.map(m => m.userId);
                        if (mIds.includes(user.id) && mIds.includes(targetUserId)) {
                            // Room already exists! Return it.
                            const [existingRoom] = await db.select().from(chats).where(eq(chats.id, cid));
                            return res.status(200).json(existingRoom);
                        }
                    }
                }
            }

            // Create room
            const [newRoom] = await db.insert(chats).values({
                name: name || null,
                type: type || 'direct',
                workspaceId: activeWorkspaceId,
                projectId: projectId || null,
                createdAt: new Date()
            }).returning();

            // Add members
            const allMemberIds = Array.from(new Set([user.id, ...(userIds || [])]));
            for (const memberId of allMemberIds) {
                await db.insert(chatMembers).values({
                    chatId: newRoom.id,
                    userId: memberId,
                    joinedAt: new Date()
                });
            }

            return res.status(201).json(newRoom);
        } catch (error) {
            console.error('Error creating chat room:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 3. Get message history of a room
    static async getMessages(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const roomId = parseInt(req.params.id, 10);
            if (isNaN(roomId)) return res.status(400).json({ message: 'Invalid Room ID' });

            // Verify membership
            const [membership] = await db.select().from(chatMembers)
                .where(
                    and(
                        eq(chatMembers.chatId, roomId),
                        eq(chatMembers.userId, user.id)
                    )
                );
            if (!membership) return res.status(403).json({ message: 'Forbidden: You are not a member of this chat' });

            const list = await db.select({
                id: messages.id,
                chatId: messages.chatId,
                senderId: messages.senderId,
                senderName: users.name,
                senderEmail: users.email,
                senderAvatar: users.avatarUrl,
                content: messages.content,
                createdAt: messages.createdAt
            })
            .from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(eq(messages.chatId, roomId))
            .orderBy(sql`${messages.createdAt} asc`);

            return res.status(200).json(list);
        } catch (error) {
            console.error('Error in getMessages:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 4. Send a new message
    static async sendMessage(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const roomId = parseInt(req.params.id, 10);
            if (isNaN(roomId)) return res.status(400).json({ message: 'Invalid Room ID' });

            const { content } = req.body;
            if (!content || content.trim().length === 0) {
                return res.status(400).json({ message: 'Message content is required' });
            }

            // Verify membership
            const [membership] = await db.select().from(chatMembers)
                .where(
                    and(
                        eq(chatMembers.chatId, roomId),
                        eq(chatMembers.userId, user.id)
                    )
                );
            if (!membership) return res.status(403).json({ message: 'Forbidden: You are not a member of this chat' });

            const [newMsg] = await db.insert(messages).values({
                chatId: roomId,
                senderId: user.id,
                content: content.trim(),
                createdAt: new Date()
            }).returning();

            // Enrich message with sender details
            const enrichedMessage = {
                id: newMsg.id,
                chatId: newMsg.chatId,
                senderId: newMsg.senderId,
                senderName: user.name,
                senderEmail: user.email,
                senderAvatar: user.avatarUrl || null,
                content: newMsg.content,
                createdAt: newMsg.createdAt
            };

            // Broadcast message via Socket
            socketService.broadcastToChat(roomId, 'new_message', enrichedMessage);

            return res.status(201).json(enrichedMessage);
        } catch (error) {
            console.error('Error sending message:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}
