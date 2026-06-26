import { Request, Response } from 'express';
import { db } from '../db/index';
import { projectDocuments, fileVersions, fileDownloads, users } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export class FileController {
    // 1. Get version history for a file
    static async getVersions(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const fileId = parseInt(req.params.id, 10);
            if (isNaN(fileId)) return res.status(400).json({ message: 'Invalid file ID' });

            const versionsList = await db.select({
                id: fileVersions.id,
                documentId: fileVersions.documentId,
                fileName: fileVersions.fileName,
                fileUrl: fileVersions.fileUrl,
                fileSize: fileVersions.fileSize,
                fileType: fileVersions.fileType,
                version: fileVersions.version,
                createdAt: fileVersions.createdAt,
                creatorName: users.name,
                creatorEmail: users.email
            })
            .from(fileVersions)
            .leftJoin(users, eq(fileVersions.createdById, users.id))
            .where(eq(fileVersions.documentId, fileId))
            .orderBy(sql`${fileVersions.version} desc`);

            return res.status(200).json(versionsList);
        } catch (error) {
            console.error('Error in getVersions:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 2. Add a new version of an existing file
    static async addVersion(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const fileId = parseInt(req.params.id, 10);
            if (isNaN(fileId)) return res.status(400).json({ message: 'Invalid file ID' });

            const { fileName, fileUrl, fileSize, fileType } = req.body;
            if (!fileUrl) return res.status(400).json({ message: 'File URL is required' });

            // Get original document
            const [doc] = await db.select().from(projectDocuments).where(eq(projectDocuments.id, fileId));
            if (!doc) return res.status(404).json({ message: 'Document not found' });

            // Determine next version number
            const [maxVersion] = await db.select({
                maxVer: sql`max(${fileVersions.version})`
            }).from(fileVersions).where(eq(fileVersions.documentId, fileId));

            const nextVer = (Number(maxVersion?.maxVer) || 1) + 1;

            // Insert new version
            const [newVersion] = await db.insert(fileVersions).values({
                documentId: fileId,
                fileName: fileName || doc.fileName,
                fileUrl: fileUrl,
                fileSize: fileSize || null,
                fileType: fileType || null,
                version: nextVer,
                createdById: user.id,
                createdAt: new Date()
            }).returning();

            // Update main document pointer
            await db.update(projectDocuments)
                .set({
                    fileName: fileName || doc.fileName,
                    fileUrl: fileUrl,
                    fileSize: fileSize || doc.fileSize,
                    fileType: fileType || doc.fileType
                })
                .where(eq(projectDocuments.id, fileId));

            return res.status(201).json(newVersion);
        } catch (error) {
            console.error('Error in addVersion:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 3. Track a file download (logs user, IP, User Agent for audit purposes)
    static async trackDownload(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const fileId = parseInt(req.params.id, 10);
            if (isNaN(fileId)) return res.status(400).json({ message: 'Invalid file ID' });

            const ipAddress = (req as any).clientIp || req.ip || '127.0.0.1';
            const userAgent = req.headers['user-agent'] || 'Unknown';

            const [newDownload] = await db.insert(fileDownloads).values({
                documentId: fileId,
                userId: user.id,
                ipAddress,
                userAgent,
                downloadedAt: new Date()
            }).returning();

            return res.status(201).json(newDownload);
        } catch (error) {
            console.error('Error in trackDownload:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 4. Get download history logs for a file
    static async getDownloads(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const fileId = parseInt(req.params.id, 10);
            if (isNaN(fileId)) return res.status(400).json({ message: 'Invalid file ID' });

            const list = await db.select({
                id: fileDownloads.id,
                ipAddress: fileDownloads.ipAddress,
                userAgent: fileDownloads.userAgent,
                downloadedAt: fileDownloads.downloadedAt,
                userName: users.name,
                userEmail: users.email
            })
            .from(fileDownloads)
            .leftJoin(users, eq(fileDownloads.userId, users.id))
            .where(eq(fileDownloads.documentId, fileId))
            .orderBy(sql`${fileDownloads.downloadedAt} desc`);

            return res.status(200).json(list);
        } catch (error) {
            console.error('Error in getDownloads:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}
