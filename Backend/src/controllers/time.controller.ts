import { Request, Response } from 'express';
import { db } from '../db/index';
import { timeLogs, tasks } from '../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export class TimeController {
    // 1. Get all logs for the current workspace and/or current user
    static async getLogs(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const list = await db.select({
                id: timeLogs.id,
                description: timeLogs.description,
                startTime: timeLogs.startTime,
                endTime: timeLogs.endTime,
                duration: timeLogs.duration,
                taskId: timeLogs.taskId,
                taskTitle: tasks.title,
                createdAt: timeLogs.createdAt
            })
            .from(timeLogs)
            .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
            .where(
                and(
                    eq(timeLogs.workspaceId, activeWorkspaceId),
                    eq(timeLogs.userId, user.id)
                )
            )
            .orderBy(sql`${timeLogs.startTime} desc`);

            return res.status(200).json(list);
        } catch (error) {
            console.error('Error in getLogs:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 2. Check if user has an active timer running
    static async getActiveTimer(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const [active] = await db.select({
                id: timeLogs.id,
                description: timeLogs.description,
                startTime: timeLogs.startTime,
                taskId: timeLogs.taskId,
                taskTitle: tasks.title
            })
            .from(timeLogs)
            .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
            .where(
                and(
                    eq(timeLogs.workspaceId, activeWorkspaceId),
                    eq(timeLogs.userId, user.id),
                    isNull(timeLogs.endTime)
                )
            )
            .limit(1);

            return res.status(200).json(active || null);
        } catch (error) {
            console.error('Error in getActiveTimer:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 3. Start a timer
    static async startTimer(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const { description, taskId } = req.body;

            // Check if there is already an active timer
            const [active] = await db.select().from(timeLogs).where(
                and(
                    eq(timeLogs.workspaceId, activeWorkspaceId),
                    eq(timeLogs.userId, user.id),
                    isNull(timeLogs.endTime)
                )
            ).limit(1);

            if (active) {
                return res.status(400).json({ message: 'A timer is already running. Please stop it first.' });
            }

            const [newLog] = await db.insert(timeLogs).values({
                workspaceId: activeWorkspaceId,
                userId: user.id,
                taskId: taskId ? parseInt(taskId, 10) : null,
                description: description || '',
                startTime: new Date(),
                createdAt: new Date()
            }).returning();

            return res.status(201).json(newLog);
        } catch (error) {
            console.error('Error in startTimer:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 4. Stop a timer
    static async stopTimer(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            // Find running timer
            const [active] = await db.select().from(timeLogs).where(
                and(
                    eq(timeLogs.workspaceId, activeWorkspaceId),
                    eq(timeLogs.userId, user.id),
                    isNull(timeLogs.endTime)
                )
            ).limit(1);

            if (!active) {
                return res.status(400).json({ message: 'No running timer found.' });
            }

            const endTime = new Date();
            const duration = Math.round((endTime.getTime() - active.startTime.getTime()) / 1000);

            const [updated] = await db.update(timeLogs)
                .set({
                    endTime,
                    duration: duration > 0 ? duration : 0
                })
                .where(eq(timeLogs.id, active.id))
                .returning();

            return res.status(200).json(updated);
        } catch (error) {
            console.error('Error in stopTimer:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 5. Create manual log entry
    static async createManualLog(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const { description, taskId, startTime, endTime } = req.body;
            if (!startTime || !endTime) {
                return res.status(400).json({ message: 'Start time and end time are required' });
            }

            const start = new Date(startTime);
            const end = new Date(endTime);
            const duration = Math.round((end.getTime() - start.getTime()) / 1000);

            if (duration < 0) {
                return res.status(400).json({ message: 'End time must be after start time' });
            }

            const [newLog] = await db.insert(timeLogs).values({
                workspaceId: activeWorkspaceId,
                userId: user.id,
                taskId: taskId ? parseInt(taskId, 10) : null,
                description: description || '',
                startTime: start,
                endTime: end,
                duration,
                createdAt: new Date()
            }).returning();

            return res.status(201).json(newLog);
        } catch (error) {
            console.error('Error in createManualLog:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}
