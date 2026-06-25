import { db } from '../db/index';
import { stories, epics, activityLogs, tasks } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';

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
        console.error('Failed to log story activity:', err);
    }
}

export const getStories = async (req: Request, res: Response) => {
    try {
        const epicId = parseInt(req.query.epicId as string, 10);
        const projectId = parseInt(req.query.projectId as string, 10);

        let list;
        if (!isNaN(epicId)) {
            list = await db.select().from(stories).where(eq(stories.epicId, epicId));
        } else if (!isNaN(projectId)) {
            // Find epics belonging to this project
            const projectEpics = await db.select().from(epics).where(eq(epics.projectId, projectId));
            const epicIds = projectEpics.map(e => e.id);
            if (epicIds.length === 0) {
                return res.status(200).json([]);
            }
            // Fetch stories for those epics
            const allStories = await db.select().from(stories);
            list = allStories.filter(s => epicIds.includes(s.epicId));
        } else {
            return res.status(400).json({ message: "Either epicId or projectId is required" });
        }

        const allTasks = await db.select().from(tasks);
        const result = list.map(story => {
            const storyTasks = allTasks.filter(t => t.storyId === story.id);
            const totalTasks = storyTasks.length;
            const completedTasks = storyTasks.filter(t => t.status === 'done').length;

            return {
                ...story,
                totalTasks,
                completedTasks,
                progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
            };
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in getStories:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const createStory = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { epicId, name, description, points, status } = req.body;
        if (!epicId || !name) {
            return res.status(400).json({ message: "Epic ID and Story Name are required" });
        }

        const [created] = await db.insert(stories).values({
            epicId: parseInt(epicId, 10),
            name: name.trim(),
            description: description || null,
            points: points ? parseInt(points, 10) : 0,
            status: status || 'todo'
        }).returning();

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'CREATE', 'story', created.id, `Created story ${created.name}`, ip);

        return res.status(201).json(created);
    } catch (error) {
        console.error("Error in createStory:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateStory = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid story ID" });

        const [story] = await db.select().from(stories).where(eq(stories.id, id));
        if (!story) return res.status(404).json({ message: "Story not found" });

        const { name, description, points, status } = req.body;

        const [updated] = await db.update(stories)
            .set({
                name: name !== undefined ? name.trim() : story.name,
                description: description !== undefined ? description : story.description,
                points: points !== undefined ? parseInt(points, 10) || 0 : story.points,
                status: status !== undefined ? status : story.status,
                updatedAt: new Date()
            })
            .where(eq(stories.id, id))
            .returning();

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'UPDATE', 'story', id, `Updated story ${updated.name}`, ip);

        return res.status(200).json(updated);
    } catch (error) {
        console.error("Error in updateStory:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteStory = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ message: "Access denied" });
        }

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid story ID" });

        const [story] = await db.select().from(stories).where(eq(stories.id, id));
        if (!story) return res.status(404).json({ message: "Story not found" });

        // Unlink all tasks from this story
        await db.update(tasks).set({ storyId: null }).where(eq(tasks.storyId, id));

        await db.delete(stories).where(eq(stories.id, id));

        const ip = (req as any).clientIp || req.ip || null;
        await logActivity(user.id, 'DELETE', 'story', id, `Deleted story ${story.name}`, ip);

        return res.status(200).json({ message: "Story deleted successfully" });
    } catch (error) {
        console.error("Error in deleteStory:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
