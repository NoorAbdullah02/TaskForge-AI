import { db } from '../db/index';
import { sprints, tasks, projects, activityLogs, users } from '../db/schema';
import { eq, and, ne } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { EmailTriggerService } from '../services/emailTrigger.service';
import { isProjectManager } from '../lib/projectAuth';
import { socketService } from '../services/socket.service';

async function logActivity(userId: number | null, action: string, entityType: string, entityId: number | null, details: string, ip: string | null) {
    try {
        await db.insert(activityLogs).values({
            userId,
            action,
            entityType,
            entityId,
            details,
            ipAddress: ip ? ip.substring(0, 50) : null
        });
    } catch (err) {
        console.error('Failed to log sprint activity:', err);
    }
}

export const getSprints = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.query.projectId as string, 10);
        if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });

        const list = await db.select().from(sprints).where(eq(sprints.projectId, projectId));
        const allTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));

        const result = list.map(s => {
            const sprintTasks = allTasks.filter(t => t.sprintId === s.id);
            const totalTasks = sprintTasks.length;
            const completedTasks = sprintTasks.filter(t => t.status === 'done').length;

            return {
                ...s,
                totalTasks,
                completedTasks,
                progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
            };
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in getSprints:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const createSprint = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const { projectId, name, startDate, endDate, goal } = req.body;
        if (!projectId || !name) {
            return res.status(400).json({ message: "Project ID and Sprint Name are required" });
        }

        const isPM = await isProjectManager(user.id, user.role, parseInt(projectId, 10));
        if (!isPM) {
            return res.status(403).json({ message: "Access denied: You are not the project manager" });
        }

        const [proj] = await db.select().from(projects).where(eq(projects.id, parseInt(projectId, 10)));
        if (!proj) return res.status(404).json({ message: "Project not found" });

        const [created] = await db.insert(sprints).values({
            projectId: parseInt(projectId, 10),
            name: name.trim(),
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            goal: goal || null,
            status: 'future'
        }).returning();

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'CREATE', 'sprint', created.id, `Created sprint ${created.name} for project ${proj.name}`, ip);

        if (user.activeWorkspaceId) {
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'sprint_updated', { action: 'created', sprintId: created.id, projectId: parseInt(projectId, 10) });
        }

        return res.status(201).json(created);
    } catch (error) {
        console.error("Error in createSprint:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateSprint = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid sprint ID" });

        const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
        if (!sprint) return res.status(404).json({ message: "Sprint not found" });

        const isPM = await isProjectManager(user.id, user.role, sprint.projectId);
        if (!isPM) {
            return res.status(403).json({ message: "Access denied: You are not the project manager" });
        }

        const { name, startDate, endDate, goal, status } = req.body;

        const [updated] = await db.update(sprints)
            .set({
                name: name !== undefined ? name.trim() : sprint.name,
                startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : sprint.startDate,
                endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : sprint.endDate,
                goal: goal !== undefined ? goal : sprint.goal,
                status: status !== undefined ? status : sprint.status,
                updatedAt: new Date()
            })
            .where(eq(sprints.id, id))
            .returning();

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'UPDATE', 'sprint', id, `Updated sprint ${updated.name}`, ip);

        if (user.activeWorkspaceId) {
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'sprint_updated', { action: 'updated', sprintId: id, projectId: sprint.projectId });
        }

        return res.status(200).json(updated);
    } catch (error) {
        console.error("Error in updateSprint:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const startSprint = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid sprint ID" });

        const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
        if (!sprint) return res.status(404).json({ message: "Sprint not found" });

        const isPM = await isProjectManager(user.id, user.role, sprint.projectId);
        if (!isPM) {
            return res.status(403).json({ message: "Access denied: You are not the project manager" });
        }

        // Verify no other active sprint for this project
        const activeSprints = await db.select().from(sprints).where(
            and(
                eq(sprints.projectId, sprint.projectId),
                eq(sprints.status, 'active')
            )
        );

        if (activeSprints.length > 0) {
            return res.status(400).json({ message: "There is already an active sprint for this project. Complete it first." });
        }

        const [started] = await db.update(sprints)
            .set({
                status: 'active',
                startDate: new Date(),
                updatedAt: new Date()
            })
            .where(eq(sprints.id, id))
            .returning();

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'UPDATE', 'sprint', id, `Started sprint ${started.name}`, ip);

        if (user.activeWorkspaceId) {
            await EmailTriggerService.sendSprintStarted(
                user.email,
                user.name,
                started.name,
                started.goal || 'No goal specified',
                user.activeWorkspaceId
            );
        }

        if (user.activeWorkspaceId) {
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'sprint_updated', { action: 'started', sprintId: id, projectId: sprint.projectId });
        }

        return res.status(200).json(started);
    } catch (error) {
        console.error("Error in startSprint:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const completeSprint = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid sprint ID" });

        const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
        if (!sprint) return res.status(404).json({ message: "Sprint not found" });

        const isPM = await isProjectManager(user.id, user.role, sprint.projectId);
        if (!isPM) {
            return res.status(403).json({ message: "Access denied: You are not the project manager" });
        }

        // Update sprint status
        const [completed] = await db.update(sprints)
            .set({
                status: 'completed',
                endDate: new Date(),
                updatedAt: new Date()
            })
            .where(eq(sprints.id, id))
            .returning();

        // Agile logic: Move uncompleted tasks (anything not 'done') back to backlog (sprintId = null)
        const uncompletedTasks = await db.select().from(tasks).where(
            and(
                eq(tasks.sprintId, id),
                ne(tasks.status, 'done')
            )
        );

        if (uncompletedTasks.length > 0) {
            const taskIds = uncompletedTasks.map(t => t.id);
            for (const taskId of taskIds) {
                await db.update(tasks).set({ sprintId: null }).where(eq(tasks.id, taskId));
            }
        }

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'UPDATE', 'sprint', id, `Completed sprint ${completed.name}. Moved ${uncompletedTasks.length} incomplete tasks to backlog.`, ip);

        if (user.activeWorkspaceId) {
            const reportText = `Sprint Completed successfully. Name: ${completed.name}. Incomplete tasks moved back to backlog: ${uncompletedTasks.length}.`;
            await EmailTriggerService.sendSprintCompleted(
                user.email,
                user.name,
                completed.name,
                reportText,
                user.activeWorkspaceId
            );
        }

        if (user.activeWorkspaceId) {
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'sprint_updated', { action: 'completed', sprintId: id, projectId: sprint.projectId });
        }

        return res.status(200).json({
            message: "Sprint completed successfully",
            sprint: completed,
            movedTasksCount: uncompletedTasks.length
        });
    } catch (error) {
        console.error("Error in completeSprint:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteSprint = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid sprint ID" });

        const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
        if (!sprint) return res.status(404).json({ message: "Sprint not found" });

        const isPM = await isProjectManager(user.id, user.role, sprint.projectId);
        if (!isPM) {
            return res.status(403).json({ message: "Access denied: You are not the project manager" });
        }

        // Move all tasks in this sprint to backlog
        await db.update(tasks).set({ sprintId: null }).where(eq(tasks.sprintId, id));

        await db.delete(sprints).where(eq(sprints.id, id));

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'DELETE', 'sprint', id, `Deleted sprint ${sprint.name}`, ip);

        if (user.activeWorkspaceId) {
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'sprint_updated', { action: 'deleted', sprintId: id, projectId: sprint.projectId });
        }

        return res.status(200).json({ message: "Sprint deleted successfully" });
    } catch (error) {
        console.error("Error in deleteSprint:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
