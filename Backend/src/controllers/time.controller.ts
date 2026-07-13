import { Request, Response } from 'express';
import { db } from '../db/index';
import { timeLogs, tasks, users, projects, workspaceMembers } from '../db/schema';
import { eq, and, isNull, sql, gte, inArray, ne } from 'drizzle-orm';
import { socketService } from '../services/socket.service';

const MANAGER_ROLES = ['owner', 'admin', 'manager', 'super_admin'];

function computeElapsedSeconds(log: typeof timeLogs.$inferSelect, now: Date): number {
    const start = log.startTime.getTime();
    let pausedMs = log.totalPausedSeconds * 1000;
    if (log.status === 'paused' && log.pausedAt) {
        pausedMs += now.getTime() - log.pausedAt.getTime();
    }
    const elapsedMs = now.getTime() - start - pausedMs;
    return Math.max(0, Math.round(elapsedMs / 1000));
}

async function verifyManager(req: Request, res: Response): Promise<any | null> {
    const user = (req as any).user;
    if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return null;
    }
    if (!MANAGER_ROLES.includes(user.role)) {
        res.status(403).json({ message: 'Manager access required' });
        return null;
    }
    return user;
}

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
                status: timeLogs.status,
                pausedAt: timeLogs.pausedAt,
                totalPausedSeconds: timeLogs.totalPausedSeconds,
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

    // 2. Check if user has an active (running or paused) timer
    static async getActiveTimer(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const [active] = await db.select()
            .from(timeLogs)
            .where(
                and(
                    eq(timeLogs.workspaceId, activeWorkspaceId),
                    eq(timeLogs.userId, user.id),
                    isNull(timeLogs.endTime)
                )
            )
            .limit(1);

            if (!active) return res.status(200).json(null);

            const elapsedSeconds = computeElapsedSeconds(active, new Date());
            return res.status(200).json({ ...active, elapsedSeconds });
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
                status: 'running',
                createdAt: new Date()
            }).returning();

            if (newLog.taskId) {
                await db.update(tasks).set({ isTimerActive: true, timerStartedAt: newLog.startTime }).where(eq(tasks.id, newLog.taskId));
            }

            socketService.broadcastToWorkspace(activeWorkspaceId, 'timer.started', { userId: user.id, logId: newLog.id, taskId: newLog.taskId });

            return res.status(201).json(newLog);
        } catch (error) {
            console.error('Error in startTimer:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 3b. Pause the active timer
    static async pauseTimer(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const [active] = await db.select().from(timeLogs).where(
                and(
                    eq(timeLogs.workspaceId, activeWorkspaceId),
                    eq(timeLogs.userId, user.id),
                    isNull(timeLogs.endTime),
                    eq(timeLogs.status, 'running')
                )
            ).limit(1);

            if (!active) return res.status(400).json({ message: 'No running timer found.' });

            const [updated] = await db.update(timeLogs)
                .set({ status: 'paused', pausedAt: new Date() })
                .where(eq(timeLogs.id, active.id))
                .returning();

            if (updated.taskId) {
                const [task] = await db.select().from(tasks).where(eq(tasks.id, updated.taskId)).limit(1);
                if (task) {
                    await db.update(tasks).set({
                        isTimerActive: false,
                        timerStartedAt: null
                    }).where(eq(tasks.id, updated.taskId));

                    socketService.broadcastToWorkspace(activeWorkspaceId, 'task_updated', { 
                        action: 'timer_paused', 
                        taskId: updated.taskId,
                        projectId: task.projectId 
                    });
                }
            }

            socketService.broadcastToWorkspace(activeWorkspaceId, 'timer.paused', { userId: user.id, logId: updated.id, taskId: updated.taskId });

            return res.status(200).json(updated);
        } catch (error) {
            console.error('Error in pauseTimer:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 3c. Resume a paused timer
    static async resumeTimer(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const [active] = await db.select().from(timeLogs).where(
                and(
                    eq(timeLogs.workspaceId, activeWorkspaceId),
                    eq(timeLogs.userId, user.id),
                    isNull(timeLogs.endTime),
                    eq(timeLogs.status, 'paused')
                )
            ).limit(1);

            if (!active) return res.status(400).json({ message: 'No paused timer found.' });

            const now = new Date();
            const additionalPaused = active.pausedAt ? Math.round((now.getTime() - active.pausedAt.getTime()) / 1000) : 0;

            const [updated] = await db.update(timeLogs)
                .set({
                    status: 'running',
                    pausedAt: null,
                    totalPausedSeconds: active.totalPausedSeconds + additionalPaused
                })
                .where(eq(timeLogs.id, active.id))
                .returning();

            if (updated.taskId) {
                const [task] = await db.select().from(tasks).where(eq(tasks.id, updated.taskId)).limit(1);
                if (task) {
                    await db.update(tasks).set({
                        isTimerActive: true,
                        timerStartedAt: now
                    }).where(eq(tasks.id, updated.taskId));

                    socketService.broadcastToWorkspace(activeWorkspaceId, 'task_updated', { 
                        action: 'timer_resumed', 
                        taskId: updated.taskId,
                        projectId: task.projectId 
                    });
                }
            }

            socketService.broadcastToWorkspace(activeWorkspaceId, 'timer.resumed', { userId: user.id, logId: updated.id, taskId: updated.taskId });

            return res.status(200).json(updated);
        } catch (error) {
            console.error('Error in resumeTimer:', error);
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
            let totalPausedSeconds = active.totalPausedSeconds;
            if (active.status === 'paused' && active.pausedAt) {
                totalPausedSeconds += Math.round((endTime.getTime() - active.pausedAt.getTime()) / 1000);
            }
            const duration = Math.round((endTime.getTime() - active.startTime.getTime()) / 1000) - totalPausedSeconds;

            const [updated] = await db.update(timeLogs)
                .set({
                    endTime,
                    duration: duration > 0 ? duration : 0,
                    status: 'stopped',
                    pausedAt: null,
                    totalPausedSeconds
                })
                .where(eq(timeLogs.id, active.id))
                .returning();

            if (updated.taskId) {
                const [task] = await db.select().from(tasks).where(eq(tasks.id, updated.taskId)).limit(1);
                if (task) {
                    const addedHours = (updated.duration || 0) / 3600;
                    await db.update(tasks).set({
                        isTimerActive: false,
                        timerStartedAt: null,
                        actualHours: (task.actualHours || 0) + addedHours
                    }).where(eq(tasks.id, updated.taskId));

                    socketService.broadcastToWorkspace(activeWorkspaceId, 'task_updated', { 
                        action: 'timer_stopped', 
                        taskId: updated.taskId, 
                        projectId: task.projectId 
                    });
                }
            }

            socketService.broadcastToWorkspace(activeWorkspaceId, 'timer.stopped', { userId: user.id, logId: updated.id, taskId: updated.taskId, duration: updated.duration });

            return res.status(200).json(updated);
        } catch (error) {
            console.error('Error in stopTimer:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 4b. Restart timer for the same task as the given (stopped) log — creates a fresh session
    static async restartTimer(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const logId = parseInt(req.params.id, 10);
            const [source] = await db.select().from(timeLogs).where(
                and(eq(timeLogs.id, logId), eq(timeLogs.workspaceId, activeWorkspaceId), eq(timeLogs.userId, user.id))
            ).limit(1);
            if (!source) return res.status(404).json({ message: 'Time log not found' });

            const [active] = await db.select().from(timeLogs).where(
                and(
                    eq(timeLogs.workspaceId, activeWorkspaceId),
                    eq(timeLogs.userId, user.id),
                    isNull(timeLogs.endTime)
                )
            ).limit(1);
            if (active) return res.status(400).json({ message: 'A timer is already running. Please stop it first.' });

            const [newLog] = await db.insert(timeLogs).values({
                workspaceId: activeWorkspaceId,
                userId: user.id,
                taskId: source.taskId,
                description: source.description || '',
                startTime: new Date(),
                status: 'running',
                createdAt: new Date()
            }).returning();

            if (newLog.taskId) {
                await db.update(tasks).set({ isTimerActive: true, timerStartedAt: newLog.startTime }).where(eq(tasks.id, newLog.taskId));
            }

            socketService.broadcastToWorkspace(activeWorkspaceId, 'timer.started', { userId: user.id, logId: newLog.id, taskId: newLog.taskId });

            return res.status(201).json(newLog);
        } catch (error) {
            console.error('Error in restartTimer:', error);
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
                status: 'stopped',
                createdAt: new Date()
            }).returning();

            return res.status(201).json(newLog);
        } catch (error) {
            console.error('Error in createManualLog:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 6. Hours summary for the current user: today / week / month / total
    static async getMyHoursSummary(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });
            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const summary = await computeHoursSummary(activeWorkspaceId, user.id);
            return res.status(200).json(summary);
        } catch (error) {
            console.error('Error in getMyHoursSummary:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 7. Manager Dashboard — hours for every workspace member
    static async getWorkspaceHours(req: Request, res: Response) {
        try {
            const user = await verifyManager(req, res);
            if (!user) return;

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const members = await db.select({
                userId: workspaceMembers.userId,
                name: users.name,
                email: users.email
            })
            .from(workspaceMembers)
            .innerJoin(users, eq(workspaceMembers.userId, users.id))
            .where(and(eq(workspaceMembers.workspaceId, activeWorkspaceId), eq(workspaceMembers.status, 'active')));

            const results = await Promise.all(members.map(async (m) => ({
                ...m,
                ...(await computeHoursSummary(activeWorkspaceId, m.userId))
            })));

            const workspaceTotal = await computeHoursSummary(activeWorkspaceId, null);

            return res.status(200).json({ members: results, workspaceTotal });
        } catch (error) {
            console.error('Error in getWorkspaceHours:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 8. Project hours breakdown (via task->project join)
    static async getProjectHours(req: Request, res: Response) {
        try {
            const user = await verifyManager(req, res);
            if (!user) return;

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const rows = await db.select({
                projectId: projects.id,
                projectName: projects.name,
                totalSeconds: sql<number>`coalesce(sum(${timeLogs.duration}), 0)::int`
            })
            .from(timeLogs)
            .innerJoin(tasks, eq(timeLogs.taskId, tasks.id))
            .innerJoin(projects, eq(tasks.projectId, projects.id))
            .where(and(eq(timeLogs.workspaceId, activeWorkspaceId), ne(timeLogs.status, 'running')))
            .groupBy(projects.id, projects.name);

            const formatted = rows.map(r => ({ ...r, totalHours: Math.round((r.totalSeconds / 3600) * 100) / 100 }));

            return res.status(200).json(formatted);
        } catch (error) {
            console.error('Error in getProjectHours:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

async function computeHoursSummary(workspaceId: number, userId: number | null) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseConditions = userId
        ? and(eq(timeLogs.workspaceId, workspaceId), eq(timeLogs.userId, userId))
        : eq(timeLogs.workspaceId, workspaceId);

    const sumSecondsSince = async (since: Date) => {
        const [row] = await db.select({
            total: sql<number>`coalesce(sum(
                case when ${timeLogs.endTime} is not null then ${timeLogs.duration}
                else greatest(0, extract(epoch from (now() - ${timeLogs.startTime}))::int - ${timeLogs.totalPausedSeconds})
                end
            ), 0)::int`
        })
        .from(timeLogs)
        .where(and(baseConditions, gte(timeLogs.startTime, since)));
        return row?.total || 0;
    };

    const [todaySeconds, weekSeconds, monthSeconds, totalRow] = await Promise.all([
        sumSecondsSince(startOfToday),
        sumSecondsSince(startOfWeek),
        sumSecondsSince(startOfMonth),
        db.select({
            total: sql<number>`coalesce(sum(
                case when ${timeLogs.endTime} is not null then ${timeLogs.duration}
                else greatest(0, extract(epoch from (now() - ${timeLogs.startTime}))::int - ${timeLogs.totalPausedSeconds})
                end
            ), 0)::int`
        }).from(timeLogs).where(baseConditions).then(rows => rows[0]?.total || 0)
    ]);

    const toHours = (s: number) => Math.round((s / 3600) * 100) / 100;

    return {
        todayHours: toHours(todaySeconds),
        weekHours: toHours(weekSeconds),
        monthHours: toHours(monthSeconds),
        totalHours: toHours(totalRow)
    };
}
