import { Request, Response } from 'express';
import { db } from '../db/index';
import { workspaces, users, projects, activityLogs, aiRequests, emailLogs, attachments, projectDocuments, sessionTable, workspaceMembers } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { EmailTriggerService } from '../services/emailTrigger.service';

export class SuperAdminController {
    // 1. Get all workspaces
    static async getWorkspaces(req: Request, res: Response) {
        try {
            const list = await db.select({
                id: workspaces.id,
                name: workspaces.name,
                slug: workspaces.slug,
                status: workspaces.status,
                createdAt: workspaces.createdAt,
                inviteCode: workspaces.inviteCode,
                logo: workspaces.logo,
                ownerName: users.name,
                ownerEmail: users.email
            })
            .from(workspaces)
            .leftJoin(users, eq(workspaces.ownerId, users.id));

            return res.status(200).json(list);
        } catch (error) {
            console.error('Error in super admin getWorkspaces:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 2. Toggle suspend workspace
    static async toggleSuspendWorkspace(req: Request, res: Response) {
        try {
            const workspaceId = parseInt(req.params.id, 10);
            if (isNaN(workspaceId)) return res.status(400).json({ message: 'Invalid Workspace ID' });

            const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
            if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

            const nextStatus = workspace.status === 'active' ? 'suspended' : 'active';
            await db.update(workspaces).set({ status: nextStatus }).where(eq(workspaces.id, workspaceId));

            // Log activity
            const adminUser = (req as any).user;
            await db.insert(activityLogs).values({
                workspaceId,
                userId: adminUser?.id || null,
                action: nextStatus === 'suspended' ? 'SUSPEND_WORKSPACE' : 'REACTIVATE_WORKSPACE',
                entityType: 'workspace',
                entityId: workspaceId,
                details: `Workspace "${workspace.name}" was ${nextStatus}ed by Super Admin`,
                ipAddress: (req as any).clientIp || req.ip || null
            });

            // Notify owner via email
            const owner = await db.select().from(users).where(eq(users.id, workspace.ownerId || 0));
            if (owner[0]) {
                if (nextStatus === 'suspended') {
                    await EmailTriggerService.sendAccountDisabled(owner[0].email, owner[0].name, 'Your workspace has been suspended by system administrators.', workspaceId);
                } else {
                    await EmailTriggerService.sendAccountEnabled(owner[0].email, owner[0].name, workspaceId);
                }
            }

            return res.status(200).json({ message: `Workspace status updated to ${nextStatus}` });
        } catch (error) {
            console.error('Error toggling suspend workspace:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 3. Delete workspace (cascade)
    static async deleteWorkspace(req: Request, res: Response) {
        try {
            const workspaceId = parseInt(req.params.id, 10);
            if (isNaN(workspaceId)) return res.status(400).json({ message: 'Invalid Workspace ID' });

            const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
            if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

            await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

            // Log activity
            const adminUser = (req as any).user;
            await db.insert(activityLogs).values({
                userId: adminUser?.id || null,
                action: 'DELETE_WORKSPACE',
                entityType: 'workspace',
                entityId: workspaceId,
                details: `Workspace "${workspace.name}" (ID: ${workspaceId}) was permanently deleted by Super Admin`,
                ipAddress: (req as any).clientIp || req.ip || null
            });

            return res.status(200).json({ message: 'Workspace permanently deleted successfully.' });
        } catch (error) {
            console.error('Error deleting workspace:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 4. Get all users
    static async getUsers(req: Request, res: Response) {
        try {
            const list = await db.select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                position: users.position,
                phone: users.phone,
                createdAt: users.createdAt
            }).from(users);

            return res.status(200).json(list);
        } catch (error) {
            console.error('Error getting users:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 5. Get all projects
    static async getProjects(req: Request, res: Response) {
        try {
            const list = await db.select({
                id: projects.id,
                name: projects.name,
                description: projects.description,
                status: projects.status,
                createdAt: projects.createdAt,
                workspaceName: workspaces.name
            })
            .from(projects)
            .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id));

            return res.status(200).json(list);
        } catch (error) {
            console.error('Error getting projects:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 6. System Analytics
    static async getAnalytics(req: Request, res: Response) {
        try {
            // counts
            const [usersCount] = await db.select({ count: sql`count(*)` }).from(users);
            const [workspacesCount] = await db.select({ count: sql`count(*)` }).from(workspaces);
            const [projectsCount] = await db.select({ count: sql`count(*)` }).from(projects);
            const [sessionsCount] = await db.select({ count: sql`count(*)` }).from(sessionTable).where(eq(sessionTable.valid, true));

            // AI Usage
            const [aiTotalTokens] = await db.select({ total: sql`sum(${aiRequests.tokensUsed})` }).from(aiRequests);
            const aiQueriesGroup = await db.select({
                type: aiRequests.promptType,
                count: sql`count(*)`,
                tokens: sql`sum(${aiRequests.tokensUsed})`
            }).from(aiRequests).groupBy(aiRequests.promptType);

            // Email Usage
            const emailStats = await db.select({
                eventType: emailLogs.eventType,
                count: sql`count(*)`,
                sent: sql`sum(case when ${emailLogs.status} = 'sent' then 1 else 0 end)`,
                failed: sql`sum(case when ${emailLogs.status} = 'failed' then 1 else 0 end)`
            }).from(emailLogs).groupBy(emailLogs.eventType);

            // Storage usage
            const [attachmentsSize] = await db.select({ size: sql`sum(${attachments.fileSize})` }).from(attachments);
            const [docsSize] = await db.select({ size: sql`sum(${projectDocuments.fileSize})` }).from(projectDocuments);
            const totalStorageBytes = (Number(attachmentsSize?.size || 0) + Number(docsSize?.size || 0));

            return res.status(200).json({
                system: {
                    totalUsers: Number(usersCount?.count || 0),
                    totalWorkspaces: Number(workspacesCount?.count || 0),
                    totalProjects: Number(projectsCount?.count || 0),
                    activeSessions: Number(sessionsCount?.count || 0)
                },
                ai: {
                    totalTokens: Number(aiTotalTokens?.total || 0),
                    breakdown: aiQueriesGroup
                },
                email: emailStats,
                storage: {
                    totalSizeMB: Number((totalStorageBytes / (1024 * 1024)).toFixed(2)),
                    attachmentsMB: Number((Number(attachmentsSize?.size || 0) / (1024 * 1024)).toFixed(2)),
                    documentsMB: Number((Number(docsSize?.size || 0) / (1024 * 1024)).toFixed(2))
                }
            });
        } catch (error) {
            console.error('Error in super admin getAnalytics:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 7. Get Audit Logs
    static async getAuditLogs(req: Request, res: Response) {
        try {
            const list = await db.select({
                id: activityLogs.id,
                action: activityLogs.action,
                entityType: activityLogs.entityType,
                entityId: activityLogs.entityId,
                details: activityLogs.details,
                ipAddress: activityLogs.ipAddress,
                createdAt: activityLogs.createdAt,
                userName: users.name,
                userEmail: users.email
            })
            .from(activityLogs)
            .leftJoin(users, eq(activityLogs.userId, users.id))
            .orderBy(sql`${activityLogs.createdAt} desc`);

            return res.status(200).json(list);
        } catch (error) {
            console.error('Error getting audit logs:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 8. Toggle ban user
    static async toggleBanUser(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId)) return res.status(400).json({ message: 'Invalid User ID' });

            const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
            if (!userRecord) return res.status(404).json({ message: 'User not found' });

            if (userRecord.role === 'super_admin') {
                return res.status(400).json({ message: 'Cannot ban a super admin' });
            }

            const nextRole = userRecord.role === 'banned' ? 'employee' : 'banned';
            await db.update(users).set({ role: nextRole }).where(eq(users.id, userId));

            // Log activity
            const adminUser = (req as any).user;
            await db.insert(activityLogs).values({
                userId: adminUser?.id || null,
                action: nextRole === 'banned' ? 'BAN_USER' : 'UNBAN_USER',
                entityType: 'user',
                entityId: userId,
                details: `User "${userRecord.name}" (${userRecord.email}) was ${nextRole === 'banned' ? 'banned' : 'unbanned'} by Super Admin`,
                ipAddress: (req as any).clientIp || req.ip || null
            });

            return res.status(200).json({ message: `User status updated to ${nextRole}` });
        } catch (error) {
            console.error('Error toggling ban user:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 9. Reset workspace
    static async resetWorkspace(req: Request, res: Response) {
        try {
            const workspaceId = parseInt(req.params.id, 10);
            if (isNaN(workspaceId)) return res.status(400).json({ message: 'Invalid Workspace ID' });

            const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
            if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

            // Fetch all projects in workspace
            const workspaceProjects = await db.select().from(projects).where(eq(projects.workspaceId, workspaceId));
            const projectIds = workspaceProjects.map(p => p.id);

            if (projectIds.length > 0) {
                // Delete projects (cascade delete will clean up tasks, subtasks, comments, attachments)
                await db.delete(projects).where(eq(projects.workspaceId, workspaceId));
            }

            // Log activity
            const adminUser = (req as any).user;
            await db.insert(activityLogs).values({
                workspaceId,
                userId: adminUser?.id || null,
                action: 'RESET_WORKSPACE',
                entityType: 'workspace',
                entityId: workspaceId,
                details: `Workspace "${workspace.name}" was reset by Super Admin (deleted ${projectIds.length} projects and all associated tasks)`,
                ipAddress: (req as any).clientIp || req.ip || null
            });

            return res.status(200).json({ message: 'Workspace successfully reset. All projects and tasks wiped.' });
        } catch (error) {
            console.error('Error resetting workspace:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}
