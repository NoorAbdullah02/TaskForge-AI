import { db } from '../db/index';
import { epics, stories, tasks, activityLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
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
        console.error('Failed to log epic activity:', err);
    }
}

export const getEpics = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.query.projectId as string, 10);
        if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });

        const list = await db.select().from(epics).where(eq(epics.projectId, projectId));
        const allStories = await db.select().from(stories);
        const allTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));

        const result = list.map(epic => {
            const epicStories = allStories.filter(s => s.epicId === epic.id);
            const storyIds = epicStories.map(s => s.id);
            const epicTasks = allTasks.filter(t => t.storyId !== null && storyIds.includes(t.storyId));

            const totalTasks = epicTasks.length;
            const completedTasks = epicTasks.filter(t => t.status === 'done').length;

            return {
                ...epic,
                storiesCount: epicStories.length,
                totalTasks,
                completedTasks,
                progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
            };
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in getEpics:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const createEpic = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const { projectId, name, description, status, startDate, endDate } = req.body;
        if (!projectId || !name) {
            return res.status(400).json({ message: "Project ID and Epic Name are required" });
        }

        const isPM = await isProjectManager(user.id, user.role, parseInt(projectId, 10));
        if (!isPM) {
            return res.status(403).json({ message: "Access denied: You are not the project manager" });
        }

        const [created] = await db.insert(epics).values({
            projectId: parseInt(projectId, 10),
            name: name.trim(),
            description: description || null,
            status: status || 'planning',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        }).returning();

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'CREATE', 'epic', created.id, `Created epic ${created.name}`, ip);

        if (user.activeWorkspaceId) {
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'epic_updated', { action: 'created', epicId: created.id, projectId: parseInt(projectId, 10) });
        }

        return res.status(201).json(created);
    } catch (error) {
        console.error("Error in createEpic:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateEpic = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid epic ID" });

        const [epic] = await db.select().from(epics).where(eq(epics.id, id));
        if (!epic) return res.status(404).json({ message: "Epic not found" });

        const isPM = await isProjectManager(user.id, user.role, epic.projectId);
        if (!isPM) {
            return res.status(403).json({ message: "Access denied: You are not the project manager" });
        }

        const { name, description, status, startDate, endDate } = req.body;

        const [updated] = await db.update(epics)
            .set({
                name: name !== undefined ? name.trim() : epic.name,
                description: description !== undefined ? description : epic.description,
                status: status !== undefined ? status : epic.status,
                startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : epic.startDate,
                endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : epic.endDate,
                updatedAt: new Date()
            })
            .where(eq(epics.id, id))
            .returning();

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'UPDATE', 'epic', id, `Updated epic ${updated.name}`, ip);

        if (user.activeWorkspaceId) {
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'epic_updated', { action: 'updated', epicId: id, projectId: epic.projectId });
        }

        return res.status(200).json(updated);
    } catch (error) {
        console.error("Error in updateEpic:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteEpic = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid epic ID" });

        const [epic] = await db.select().from(epics).where(eq(epics.id, id));
        if (!epic) return res.status(404).json({ message: "Epic not found" });

        const isPM = await isProjectManager(user.id, user.role, epic.projectId);
        if (!isPM) {
            return res.status(403).json({ message: "Access denied: You are not the project manager" });
        }

        await db.delete(epics).where(eq(epics.id, id));

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'DELETE', 'epic', id, `Deleted epic ${epic.name}`, ip);

        if (user.activeWorkspaceId) {
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'epic_updated', { action: 'deleted', epicId: id, projectId: epic.projectId });
        }

        return res.status(200).json({ message: "Epic deleted successfully" });
    } catch (error) {
        console.error("Error in deleteEpic:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
