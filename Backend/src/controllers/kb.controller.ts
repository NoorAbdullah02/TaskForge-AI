import { Request, Response } from 'express';
import { db } from '../db/index';
import { wikiPages, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class KbController {
    static async getPages(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const { type } = req.query;

            let conditions = [eq(wikiPages.workspaceId, activeWorkspaceId)];
            if (type) {
                conditions.push(eq(wikiPages.type, type as string));
            }

            const list = await db.select({
                id: wikiPages.id,
                title: wikiPages.title,
                content: wikiPages.content,
                type: wikiPages.type,
                createdAt: wikiPages.createdAt,
                updatedAt: wikiPages.updatedAt,
                creatorName: users.name,
                creatorEmail: users.email
            })
            .from(wikiPages)
            .leftJoin(users, eq(wikiPages.createdById, users.id))
            .where(and(...conditions));

            return res.status(200).json(list);
        } catch (error) {
            console.error('Error in getPages:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async createPage(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const { title, content, type } = req.body;
            if (!title) return res.status(400).json({ message: 'Title is required' });

            const [newPage] = await db.insert(wikiPages).values({
                workspaceId: activeWorkspaceId,
                title: title.trim(),
                content: content || '',
                type: type || 'wiki',
                createdById: user.id,
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();

            return res.status(201).json(newPage);
        } catch (error) {
            console.error('Error in createPage:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async updatePage(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const pageId = parseInt(req.params.id, 10);
            if (isNaN(pageId)) return res.status(400).json({ message: 'Invalid page ID' });

            const { title, content, type } = req.body;

            const [page] = await db.select().from(wikiPages).where(eq(wikiPages.id, pageId));
            if (!page) return res.status(404).json({ message: 'Page not found' });

            const [updatedPage] = await db.update(wikiPages)
                .set({
                    title: title !== undefined ? title.trim() : page.title,
                    content: content !== undefined ? content : page.content,
                    type: type !== undefined ? type : page.type,
                    updatedAt: new Date()
                })
                .where(eq(wikiPages.id, pageId))
                .returning();

            return res.status(200).json(updatedPage);
        } catch (error) {
            console.error('Error in updatePage:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async deletePage(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const pageId = parseInt(req.params.id, 10);
            if (isNaN(pageId)) return res.status(400).json({ message: 'Invalid page ID' });

            const [page] = await db.select().from(wikiPages).where(eq(wikiPages.id, pageId));
            if (!page) return res.status(404).json({ message: 'Page not found' });

            await db.delete(wikiPages).where(eq(wikiPages.id, pageId));

            return res.status(200).json({ message: 'Page deleted successfully' });
        } catch (error) {
            console.error('Error in deletePage:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}
