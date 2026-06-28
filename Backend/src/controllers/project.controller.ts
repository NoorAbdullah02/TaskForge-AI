import type { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { getUserByEmail } from '../db/queries';
import { db } from '../db/index';
import { eq, and, sql } from 'drizzle-orm';
import { projectDocuments, activityLogs, projects, projectMembers, users, tasks } from '../db/schema';
import { imagekit } from '../lib/imagekit';
import { EmailTriggerService } from '../services/emailTrigger.service';
import { socketService } from '../services/socket.service';
import { isProjectManager, isProjectMember } from '../lib/projectAuth';
import { isReviewStatus, normalizeIncomingStatus } from '../lib/taskStatus';
import { NotificationService } from '../services/notification.service';



export class ProjectController {
    // Get all projects for current user
    static async getUserProjects(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const { search, status, isArchived, departmentId, page, limit } = req.query;

            const filters: any = {};
            if (search) filters.search = String(search);
            if (status) filters.status = String(status);
            if (isArchived !== undefined) filters.isArchived = isArchived === 'true';
            if (departmentId) filters.departmentId = parseInt(departmentId as string, 10);
            if (page) filters.page = parseInt(page as string, 10);
            if (limit) filters.limit = parseInt(limit as string, 10);

            const projectsList = await ProjectService.getUserProjects(
                user.id,
                activeWorkspaceId,
                user.role,
                filters
            );
            return res.status(200).json(projectsList);
        } catch (error) {
            console.error('Error in getUserProjects:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Get specific project details (including tasks, milestones, members, progress)
    static async getProjectDetails(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            // Security: Check if user is a member of the project or Workspace Owner
            const isWorkspaceOwner = user.role === 'owner' || user.role === 'admin' || user.role === 'super_admin';
            const isMember = isWorkspaceOwner || details.members.some((m) => m.id === user.id);
            if (!isMember) return res.status(403).json({ message: 'Access denied: Not a project member' });

            return res.status(200).json(details);
        } catch (error) {
            console.error('Error in getProjectDetails:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Create a new project
    static async createProject(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { name, description, startDate, endDate, workTypes, password, departmentId } = req.body;
            if (!name || name.trim().length === 0) {
                return res.status(400).json({ message: 'Project name is required' });
            }

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const project = await ProjectService.createProject({
                name: name.trim(),
                description,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                ownerId: user.id,
                workTypes: workTypes || 'task',
                workspaceId: activeWorkspaceId,
                password: password || undefined,
                departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
            });

            if (user.activeWorkspaceId) {
                await NotificationService.dispatch({
                    event: 'project.created',
                    userId: user.id,
                    workspaceId: user.activeWorkspaceId,
                    entityType: 'project',
                    entityId: project.id,
                    title: `New Project Initiated: ${project.name}`,
                    message: `A new project "${project.name}" has been initiated in your workspace ${user.workspaceName || 'Your Workspace'}.`,
                    link: `/projects/${project.id}`,
                    emailTemplate: 'projectCreated',
                    emailData: {
                        projectName: project.name,
                        workspaceName: user.workspaceName || 'Your Workspace',
                        description: project.description || 'No description provided.',
                        link: `/projects/${project.id}`,
                    },
                });
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'project_updated', { action: 'created', projectId: project.id });
            }

            return res.status(201).json({ message: 'Project created successfully', project });
        } catch (error) {
            console.error('Error in createProject:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Update project metadata
    static async updateProject(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            // Security: Only owner or manager can update project details
            const userMember = details.members.find((m) => m.id === user.id);
            if (!userMember || (userMember.role !== 'owner' && userMember.role !== 'manager')) {
                return res.status(403).json({ message: 'Only owners or managers can edit project details' });
            }

            const { name, description, status, startDate, endDate } = req.body;
            const updated = await ProjectService.updateProject(projectId, {
                name: name ? name.trim() : undefined,
                description,
                status,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
            });

            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'project_updated', { action: 'updated', projectId });
            }

            return res.status(200).json({ message: 'Project updated successfully', project: updated });
        } catch (error) {
            console.error('Error in updateProject:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Delete project
    static async deleteProject(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            // Security: Only owner can delete project
            const userMember = details.members.find((m) => m.id === user.id);
            if (!userMember || userMember.role !== 'owner') {
                return res.status(403).json({ message: 'Only the project owner can delete the project' });
            }

            await ProjectService.deleteProject(projectId);

            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'project_updated', { action: 'deleted', projectId });
            }

            return res.status(200).json({ message: 'Project deleted successfully' });
        } catch (error) {
            console.error('Error in deleteProject:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Assign new member by email
    static async assignMember(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            // Security: Only owner or manager can assign members
            const userMember = details.members.find((m) => m.id === user.id);
            if (!userMember || (userMember.role !== 'owner' && userMember.role !== 'manager')) {
                return res.status(403).json({ message: 'Only owners or managers can add members' });
            }

            const { email, role } = req.body;
            if (!email) return res.status(400).json({ message: 'Email is required' });

            const targetUser = await getUserByEmail(email.toLowerCase().trim());
            if (!targetUser) return res.status(404).json({ message: 'User with this email not found' });

            const assignment = await ProjectService.assignMember(projectId, targetUser.id, role || 'member');

            if (user.activeWorkspaceId) {
                if (role === 'manager' || role === 'project_manager') {
                    await NotificationService.dispatch({
                        event: 'project.assigned',
                        userId: targetUser.id,
                        workspaceId: user.activeWorkspaceId,
                        entityType: 'project',
                        entityId: projectId,
                        title: 'Appointed Project Manager',
                        message: `You have been officially appointed as the Project Manager for "${details.name}".`,
                        link: `/projects/${projectId}`,
                        emailTemplate: 'projectManagerAssigned',
                        emailData: {
                            projectName: details.name,
                            link: `/projects/${projectId}`,
                        },
                    });
                } else {
                    await NotificationService.dispatch({
                        event: 'project.assigned',
                        userId: targetUser.id,
                        workspaceId: user.activeWorkspaceId,
                        entityType: 'project',
                        entityId: projectId,
                        title: 'Assigned to Project',
                        message: `You have been assigned as a member of project "${details.name}".`,
                        link: `/projects/${projectId}`,
                        emailTemplate: 'projectAssignment',
                        emailData: {
                            projectName: details.name,
                            link: `/projects/${projectId}`,
                        },
                    });
                }
            }

            return res.status(200).json({ message: 'Member assigned successfully', assignment });
        } catch (error) {
            console.error('Error in assignMember:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Remove member
    static async removeMember(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            const targetUserId = parseInt(req.params.userId, 10);

            if (isNaN(projectId) || isNaN(targetUserId)) {
                return res.status(400).json({ message: 'Invalid Project or User ID' });
            }

            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            // Security: Only owner/manager can remove members. Owner cannot be removed.
            const userMember = details.members.find((m) => m.id === user.id);
            if (!userMember || (userMember.role !== 'owner' && userMember.role !== 'manager')) {
                return res.status(403).json({ message: 'Only owners or managers can remove members' });
            }

            const targetMember = details.members.find((m) => m.id === targetUserId);
            if (!targetMember) return res.status(404).json({ message: 'Member not found in project' });
            if (targetMember.role === 'owner') return res.status(400).json({ message: 'Project owner cannot be removed' });

            await ProjectService.removeMember(projectId, targetUserId);
            return res.status(200).json({ message: 'Member removed successfully' });
        } catch (error) {
            console.error('Error in removeMember:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Create a Task or Milestone
    static async createTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            // Security: Allow project members and workspace owners/admins to create tasks
            const isMember = await isProjectMember(user.id, user.role, projectId);
            if (!isMember) {
                return res.status(403).json({ message: 'Access denied: Only project members can create tasks' });
            }

            const isPM = await isProjectManager(user.id, user.role, projectId);

            const { title, description, status, priority, assigneeId, isMilestone, dueDate, workType } = req.body;
            if (!title || title.trim().length === 0) {
                return res.status(400).json({ message: 'Task title is required' });
            }

            const parsedAssigneeId = assigneeId ? parseInt(assigneeId, 10) : null;
            if (!isPM && parsedAssigneeId && parsedAssigneeId !== user.id) {
                return res.status(403).json({ message: 'Access denied: Only project managers can assign tasks to others' });
            }

            const task = await ProjectService.createTaskOrMilestone({
                projectId,
                title: title.trim(),
                description,
                status: normalizeIncomingStatus(status) || 'todo',
                priority: priority || 'medium',
                workType: workType || 'task',
                assigneeId: isPM ? parsedAssigneeId : (parsedAssigneeId === user.id ? user.id : null),
                isMilestone: !!isMilestone,
                dueDate: dueDate ? new Date(dueDate) : null,
            });

            // Send notification to assignee using unified NotificationService
            if (task.assigneeId && user.activeWorkspaceId) {
                await NotificationService.dispatch({
                    event: 'task.assigned',
                    userId: task.assigneeId,
                    workspaceId: user.activeWorkspaceId,
                    entityType: 'task',
                    entityId: task.id,
                    title: `New Task Assigned: ${task.title}`,
                    message: `You have been assigned to task "${task.title}" in project "${details.name}".`,
                    link: `/tasks/${task.id}`,
                    emailTemplate: 'taskAssigned',
                    emailData: {
                        taskTitle: task.title,
                        projectName: details.name,
                        priority: task.priority || 'medium',
                        estimatedHours: task.estimatedHours || null,
                        link: `/tasks/${task.id}`,
                    },
                });
            }

            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'created', taskId: task.id, projectId });
            }

            return res.status(201).json({ message: 'Task created successfully', task });
        } catch (error) {
            console.error('Error in createTask:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Update Task or Milestone status or details
    static async updateTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const taskId = parseInt(req.params.taskId, 10);
            if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid Task ID' });

            const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isPM = await isProjectManager(user.id, user.role, task.projectId);
            const isAssignee = task.assigneeId === user.id;

            if (!isPM && !isAssignee) {
                return res.status(403).json({ message: 'Access denied: You are not assigned to this task' });
            }

            const { title, description, status, priority, assigneeId, isMilestone, dueDate } = req.body;
            const normalizedStatus = normalizeIncomingStatus(status);

            let updateData: any = {};
            if (isPM) {
                // PM can update everything
                updateData = {
                    title: title ? title.trim() : undefined,
                    description,
                    status: normalizedStatus,
                    priority,
                    assigneeId: assigneeId !== undefined ? (assigneeId ? parseInt(assigneeId, 10) : null) : undefined,
                    isMilestone: isMilestone !== undefined ? !!isMilestone : undefined,
                    dueDate: dueDate ? new Date(dueDate) : undefined,
                };
            } else {
                // Regular employees can ONLY update the status
                if (normalizedStatus !== undefined) {
                    if (isReviewStatus(task.status) || task.status === 'approved' || task.status === 'done' || task.status === 'rejected') {
                        return res.status(403).json({ message: 'Access denied: Only project managers can transition tasks from this status' });
                    }
                    if (normalizedStatus === 'approved' || normalizedStatus === 'rejected' || normalizedStatus === 'done') {
                        return res.status(403).json({ message: 'Access denied: Submit tasks for review instead of marking them complete' });
                    }
                    updateData.status = normalizedStatus;
                } else {
                    return res.status(403).json({ message: 'Access denied: Employees can only update task status' });
                }
            }

            const updated = await ProjectService.updateTaskOrMilestone(taskId, updateData);

            // Notify reviewers when employee submits for review
            if (
                normalizedStatus &&
                isReviewStatus(normalizedStatus) &&
                !isReviewStatus(task.status) &&
                user.activeWorkspaceId
            ) {
                const details = await ProjectService.getProjectDetails(task.projectId);
                const reviewerIds = new Set<number>();
                details?.members?.forEach((member: any) => {
                    if (['owner', 'manager', 'project_manager'].includes(member.role)) {
                        reviewerIds.add(member.id);
                    }
                });
                for (const reviewerId of reviewerIds) {
                    await NotificationService.dispatch({
                        event: 'task.assigned',
                        userId: reviewerId,
                        workspaceId: user.activeWorkspaceId,
                        entityType: 'task',
                        entityId: task.id,
                        title: 'Task Ready for Review',
                        message: `${user.name} submitted "${task.title}" for review in project "${details?.name || 'Unknown'}".`,
                        link: `/tasks/${task.id}`,
                        skipEmail: true,
                    });
                }
            }

            // Notify if status changed
            if (normalizedStatus && normalizedStatus !== task.status) {
                // Send notification to PM/Workspace Owner
                const details = await ProjectService.getProjectDetails(task.projectId);
                const ownerOrManager = details?.members?.find(m => m.role === 'owner' || m.role === 'manager');
                if (ownerOrManager) {
                    await NotificationService.dispatch({
                        event: 'project.assigned',
                        userId: ownerOrManager.id,
                        workspaceId: user.activeWorkspaceId,
                        entityType: 'task',
                        entityId: task.id,
                        title: 'Task Status Updated',
                        message: `Task "${task.title}" status was updated to "${normalizedStatus}" by ${user.name}.`,
                        link: `/tasks/${task.id}`,
                        skipEmail: true,
                    });
                }
            }

            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'updated', taskId: updated.id, projectId: updated.projectId });
            }

            return res.status(200).json({ message: 'Task updated successfully', task: updated });
        } catch (error) {
            console.error('Error in updateTask:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Delete Task or Milestone
    static async deleteTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const taskId = parseInt(req.params.taskId, 10);
            if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid Task ID' });

            const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isPM = await isProjectManager(user.id, user.role, task.projectId);
            if (!isPM) {
                return res.status(403).json({ message: 'Access denied: Only project managers can delete tasks' });
            }

            await ProjectService.deleteTaskOrMilestone(taskId);

            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'deleted', taskId, projectId: task.projectId });
            }

            return res.status(200).json({ message: 'Task deleted successfully' });
        } catch (error) {
            console.error('Error in deleteTask:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Get all project documents
    static async getProjectDocuments(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            // Check membership
            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });
            const isMember = details.members.some((m) => m.id === user.id);
            if (!isMember) return res.status(403).json({ message: 'Access denied: Not a member of the project' });

            const docs = await ProjectService.getProjectDocuments(projectId);
            return res.status(200).json(docs);
        } catch (error) {
            console.error('Error in getProjectDocuments:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Add a project document
    static async addProjectDocument(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const { fileName, fileUrl, fileSize, fileType } = req.body;
            if (!fileName || !fileUrl) {
                return res.status(400).json({ message: 'File name and URL are required' });
            }

            // Check membership
            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });
            const isMember = details.members.some((m) => m.id === user.id);
            if (!isMember) return res.status(403).json({ message: 'Access denied: Not a member of the project' });

            const doc = await ProjectService.createProjectDocument({
                projectId,
                userId: user.id,
                fileName,
                fileUrl,
                fileSize,
                fileType
            });

            return res.status(201).json({ message: 'Document added successfully', document: doc });
        } catch (error) {
            console.error('Error in addProjectDocument:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Delete a project document
    static async deleteProjectDocument(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            const docId = parseInt(req.params.docId, 10);
            if (isNaN(projectId) || isNaN(docId)) {
                return res.status(400).json({ message: 'Invalid Project ID or Document ID' });
            }

            // Check membership
            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });
            const isMember = details.members.some((m) => m.id === user.id);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            const [doc] = await db.select().from(projectDocuments).where(eq(projectDocuments.id, docId));
            if (!doc) return res.status(404).json({ message: 'Document not found' });

            // Delete from ImageKit if it's an ImageKit upload (URL has hash)
            if (doc.fileUrl && doc.fileUrl.includes('#')) {
                const fileId = doc.fileUrl.split('#')[1];
                if (fileId) {
                    try {
                        await imagekit.deleteFile(fileId);
                    } catch (err) {
                        console.error('Failed to delete file from ImageKit:', err);
                    }
                }
            }

            await ProjectService.deleteProjectDocument(docId);
            return res.status(200).json({ message: 'Document deleted successfully' });
        } catch (error) {
            console.error('Error in deleteProjectDocument:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Archive Project
    static async archiveProject(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            // Only workspace owner/admin or project owner/manager can archive
            const isWorkspaceOwner = user.role === 'owner' || user.role === 'admin';
            const userMember = details.members.find((m) => m.id === user.id);
            const isManager = userMember && (userMember.role === 'owner' || userMember.role === 'manager');

            if (!isWorkspaceOwner && !isManager) {
                return res.status(403).json({ message: 'Only workspace owners or project managers can archive projects' });
            }

            const updated = await ProjectService.updateProject(projectId, { isArchived: true });

            // Log activity
            await db.insert(activityLogs).values({
                workspaceId: details.workspaceId,
                userId: user.id,
                action: 'ARCHIVE',
                entityType: 'project',
                entityId: projectId,
                details: `Archived project "${details.name}"`,
                ipAddress: (req as any).clientIp || req.ip || null,
                createdAt: new Date()
            });

            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'project_updated', { action: 'archived', projectId });
            }

            return res.status(200).json({ message: 'Project archived successfully', project: updated });
        } catch (error) {
            console.error('Error in archiveProject:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Restore Project
    static async restoreProject(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            // Only workspace owner/admin or project owner/manager can restore
            const isWorkspaceOwner = user.role === 'owner' || user.role === 'admin';
            const userMember = details.members.find((m) => m.id === user.id);
            const isManager = userMember && (userMember.role === 'owner' || userMember.role === 'manager');

            if (!isWorkspaceOwner && !isManager) {
                return res.status(403).json({ message: 'Only workspace owners or project managers can restore projects' });
            }

            const updated = await ProjectService.updateProject(projectId, { isArchived: false });

            // Log activity
            await db.insert(activityLogs).values({
                workspaceId: details.workspaceId,
                userId: user.id,
                action: 'RESTORE',
                entityType: 'project',
                entityId: projectId,
                details: `Restored project "${details.name}"`,
                ipAddress: (req as any).clientIp || req.ip || null,
                createdAt: new Date()
            });

            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'project_updated', { action: 'restored', projectId });
            }

            return res.status(200).json({ message: 'Project restored successfully', project: updated });
        } catch (error) {
            console.error('Error in restoreProject:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Duplicate/Clone Project
    static async duplicateProject(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const { name } = req.body;

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            // Only workspace owner/admin or project manager can duplicate
            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            const isWorkspaceOwner = user.role === 'owner' || user.role === 'admin';
            const userMember = details.members.find((m) => m.id === user.id);
            const isManager = userMember && (userMember.role === 'owner' || userMember.role === 'manager');

            if (!isWorkspaceOwner && !isManager) {
                return res.status(403).json({ message: 'Only workspace owners or project managers can duplicate projects' });
            }

            const newProject = await ProjectService.duplicateProject(projectId, name, user.id, activeWorkspaceId);

            // Log activity
            await db.insert(activityLogs).values({
                workspaceId: activeWorkspaceId,
                userId: user.id,
                action: 'DUPLICATE',
                entityType: 'project',
                entityId: newProject.id,
                details: `Duplicated project "${details.name}" as "${newProject.name}"`,
                ipAddress: (req as any).clientIp || req.ip || null,
                createdAt: new Date()
            });

            if (activeWorkspaceId) {
                socketService.broadcastToWorkspace(activeWorkspaceId, 'project_updated', { action: 'duplicated', projectId: newProject.id });
            }

            return res.status(201).json({ message: 'Project duplicated successfully', project: newProject });
        } catch (error) {
            console.error('Error in duplicateProject:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Move Project (change department or workspace)
    static async moveProject(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            const isWorkspaceOwner = user.role === 'owner' || user.role === 'admin';
            if (!isWorkspaceOwner) {
                return res.status(403).json({ message: 'Only workspace owners/admins can move projects' });
            }

            const { departmentId, targetWorkspaceId } = req.body;

            const updateData: any = {};
            if (departmentId !== undefined) {
                updateData.departmentId = departmentId ? parseInt(departmentId, 10) : null;
            }
            if (targetWorkspaceId !== undefined) {
                updateData.workspaceId = targetWorkspaceId ? parseInt(targetWorkspaceId, 10) : details.workspaceId;
            }

            const updated = await ProjectService.updateProject(projectId, updateData);

            // Log activity
            await db.insert(activityLogs).values({
                workspaceId: details.workspaceId,
                userId: user.id,
                action: 'MOVE',
                entityType: 'project',
                entityId: projectId,
                details: `Moved project "${details.name}"`,
                ipAddress: (req as any).clientIp || req.ip || null,
                createdAt: new Date()
            });

            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'project_updated', { action: 'moved', projectId });
            }

            return res.status(200).json({ message: 'Project moved successfully', project: updated });
        } catch (error) {
            console.error('Error in moveProject:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Transfer Project Ownership
    static async transferOwnership(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectId = parseInt(req.params.id, 10);
            const { targetUserId } = req.body;

            if (isNaN(projectId) || !targetUserId) {
                return res.status(400).json({ message: 'Project ID and Target User ID are required' });
            }

            const details = await ProjectService.getProjectDetails(projectId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            const currentOwner = details.members.find(m => m.role === 'owner');
            const isWorkspaceOwner = user.role === 'owner' || user.role === 'admin';
            const isProjectOwner = currentOwner?.id === user.id;

            if (!isWorkspaceOwner && !isProjectOwner) {
                return res.status(403).json({ message: 'Only workspace owners or the current project owner can transfer project ownership' });
            }

            // Perform transfer in transaction
            await db.transaction(async (tx) => {
                // 1. Set current owner(s) to 'manager'
                if (currentOwner) {
                    await tx.update(projectMembers)
                        .set({ role: 'manager' })
                        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, currentOwner.id)));
                }

                // 2. Set target user to 'owner'
                const [targetMember] = await tx.select()
                    .from(projectMembers)
                    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, targetUserId)));

                if (targetMember) {
                    await tx.update(projectMembers)
                        .set({ role: 'owner' })
                        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, targetUserId)));
                } else {
                    await tx.insert(projectMembers)
                        .values({
                            projectId,
                            userId: targetUserId,
                            role: 'owner',
                            joinedAt: new Date()
                        });
                }
            });

            // Get target user details to log and notify
            const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));

            // Log activity
            await db.insert(activityLogs).values({
                workspaceId: details.workspaceId,
                userId: user.id,
                action: 'TRANSFER_OWNERSHIP',
                entityType: 'project',
                entityId: projectId,
                details: `Transferred ownership of project "${details.name}" to ${targetUser?.name || 'User ' + targetUserId}`,
                ipAddress: (req as any).clientIp || req.ip || null,
                createdAt: new Date()
            });

            // Send notification
            if (targetUser) {
                await NotificationService.dispatch({
                    event: 'project.assigned',
                    userId: targetUserId,
                    workspaceId: details.workspaceId,
                    entityType: 'project',
                    entityId: projectId,
                    title: 'Project Ownership Transferred',
                    message: `You are now the owner/creator of project "${details.name}".`,
                    link: `/projects/${projectId}`,
                    skipEmail: true,
                });
            }

            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'project_updated', { action: 'transferred', projectId });
            }

            return res.status(200).json({ message: 'Project ownership transferred successfully' });
        } catch (error) {
            console.error('Error in transferOwnership:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Join Project via Invite Code and Password
    static async joinProject(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { inviteCode, password } = req.body;
            if (!inviteCode) return res.status(400).json({ message: 'Invite Code is required' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const [project] = await db.select()
                .from(projects)
                .where(and(eq(projects.inviteCode, inviteCode), eq(projects.workspaceId, activeWorkspaceId)));

            if (!project) return res.status(404).json({ message: 'Project not found with this invite code' });

            // Check if password matches (if project is password protected)
            if (project.password && project.password !== password) {
                return res.status(403).json({ message: 'Incorrect project password' });
            }

            // Assign user as project member
            await ProjectService.assignMember(project.id, user.id, 'member');

            // Log activity
            await db.insert(activityLogs).values({
                workspaceId: activeWorkspaceId,
                userId: user.id,
                action: 'JOIN_PROJECT',
                entityType: 'project',
                entityId: project.id,
                details: `Joined project "${project.name}" via invite code`,
                ipAddress: (req as any).clientIp || req.ip || null,
                createdAt: new Date()
            });

            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'project_updated', { action: 'joined', projectId: project.id });
            }

            return res.status(200).json({ message: 'Joined project successfully', project });
        } catch (error) {
            console.error('Error in joinProject:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Export projects to JSON
    static async exportProjects(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            if (user.role !== 'owner' && user.role !== 'admin') {
                return res.status(403).json({ message: 'Only workspace owners/admins can export projects' });
            }

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const list = await db.select().from(projects).where(eq(projects.workspaceId, activeWorkspaceId));

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=projects_export_${Date.now()}.json`);
            return res.status(200).send(JSON.stringify(list, null, 2));
        } catch (error) {
            console.error('Error in exportProjects:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Import projects from JSON
    static async importProjects(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            if (user.role !== 'owner' && user.role !== 'admin') {
                return res.status(403).json({ message: 'Only workspace owners/admins can import projects' });
            }

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const { projects: importedProjects } = req.body;
            if (!Array.isArray(importedProjects)) {
                return res.status(400).json({ message: 'Invalid payload: projects array is required' });
            }

            const createdProjects = [];
            for (const item of importedProjects) {
                if (!item.name) continue;

                const inviteCode = 'PROJ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                const inviteLink = `http://localhost:5173/projects/join?code=${inviteCode}`;

                const [project] = await db.insert(projects).values({
                    workspaceId: activeWorkspaceId,
                    name: item.name,
                    description: item.description || null,
                    departmentId: item.departmentId || null,
                    status: item.status || 'planning',
                    workTypes: item.workTypes || 'task',
                    startDate: item.startDate ? new Date(item.startDate) : null,
                    endDate: item.endDate ? new Date(item.endDate) : null,
                    password: item.password || null,
                    inviteCode,
                    inviteLink,
                    isArchived: false
                }).returning();

                await db.insert(projectMembers).values({
                    projectId: project.id,
                    userId: user.id,
                    role: 'owner'
                });

                createdProjects.push(project);
            }

            // Log activity
            await db.insert(activityLogs).values({
                workspaceId: activeWorkspaceId,
                userId: user.id,
                action: 'IMPORT_PROJECTS',
                entityType: 'project',
                entityId: null,
                details: `Imported ${createdProjects.length} projects from external file`,
                ipAddress: (req as any).clientIp || req.ip || null,
                createdAt: new Date()
            });

            return res.status(201).json({ message: `Successfully imported ${createdProjects.length} projects`, projects: createdProjects });
        } catch (error) {
            console.error('Error in importProjects:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

