import type { Request, Response } from 'express';
import { TaskService } from '../services/task.service';
import { ProjectService } from '../services/project.service';
import { db } from '../db/index';
import { eq } from 'drizzle-orm';
import { subtasks, comments, attachments, users } from '../db/schema';
import { imagekit } from '../lib/imagekit';
import { EmailTriggerService } from '../services/emailTrigger.service';
import { isProjectManager, isProjectMember } from '../lib/projectAuth';
import { socketService } from '../services/socket.service';
import { ProjectIntelligenceService } from '../services/projectIntelligence.service';
import { NotificationService } from '../services/notification.service';


export class TaskController {
    // Helper to check if a user is a member of a project
    private static async verifyMembership(userId: number, projectId: number) {
        const details = await ProjectService.getProjectDetails(projectId);
        if (!details) return false;
        return details.members.some((m) => m.id === userId);
    }

    // List all tasks forprojects user belongs to
    static async getUserTasks(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { projectId, status, priority } = req.query;

            const tasksList = await TaskService.getUserTasks(user.id, {
                projectId: projectId ? parseInt(projectId as string, 10) : undefined,
                status: status as string || undefined,
                priority: priority as string || undefined,
            });

            return res.status(200).json(tasksList);
        } catch (error) {
            console.error('Error in getUserTasks:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Get specific task details, subtasks, comments, and attachments
    static async getTaskDetails(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const taskId = parseInt(req.params.id, 10);
            if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid Task ID' });

            const details = await TaskService.getTaskDetails(taskId);
            if (!details) return res.status(404).json({ message: 'Task not found' });

            // Security: Check if user is member of task's project
            const isMember = await TaskController.verifyMembership(user.id, details.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied: Not a member of the project' });

            return res.status(200).json(details);
        } catch (error) {
            console.error('Error in getTaskDetails:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Create a new task (Any project member or workspace owner/admin)
    static async createTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { projectId, title, description, status, priority, assigneeId, isMilestone, dueDate, workType } = req.body;
            if (!projectId) return res.status(400).json({ message: 'Project ID is required' });
            if (!title || title.trim().length === 0) return res.status(400).json({ message: 'Title is required' });

            const parsedProjectId = parseInt(projectId, 10);
            if (isNaN(parsedProjectId)) return res.status(400).json({ message: 'Invalid Project ID' });

            // Security: Allow project members and workspace owners/admins to create tasks
            const isMember = await isProjectMember(user.id, user.role, parsedProjectId);
            if (!isMember) {
                return res.status(403).json({ message: 'Access denied: Only project members can create tasks' });
            }

            const task = await TaskService.createTask({
                projectId: parsedProjectId,
                title: title.trim(),
                description: description || null,
                status: status || 'todo',
                priority: priority || 'medium',
                workType: workType || 'task',
                assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
                isMilestone: !!isMilestone,
                dueDate: dueDate ? new Date(dueDate) : null,
            });

            if (task.assigneeId && user.activeWorkspaceId) {
                const [targetUser] = await db.select().from(users).where(eq(users.id, task.assigneeId));
                if (targetUser) {
                    const projectDetails = await ProjectService.getProjectDetails(task.projectId);
                    // Use new NotificationService.dispatch for unified notification
                    await NotificationService.dispatch({
                        event: 'task.assigned',
                        userId: task.assigneeId,
                        workspaceId: user.activeWorkspaceId,
                        entityType: 'task',
                        entityId: task.id,
                        title: `New Task Assigned: ${task.title}`,
                        message: `You have been assigned a new task "${task.title}" in project ${projectDetails?.name || 'Unknown'}.`,
                        link: `/tasks/${task.id}`,
                        emailTemplate: 'taskAssigned',
                        emailData: {
                            taskTitle: task.title,
                            projectName: projectDetails?.name || 'Unknown Project',
                            priority: task.priority || 'medium',
                            estimatedHours: task.estimatedHours || null,
                            link: `/tasks/${task.id}`,
                        },
                    });
                }
            }

            // Socket broadcast
            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'created', taskId: task.id, projectId: parsedProjectId });
            }

            return res.status(201).json({ message: 'Task created successfully', task });
        } catch (error) {
            console.error('Error in createTask:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Update task (with RBAC: employees can only update status on their assigned tasks)
    static async updateTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const taskId = parseInt(req.params.id, 10);
            if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid Task ID' });

            const details = await TaskService.getTaskDetails(taskId);
            if (!details) return res.status(404).json({ message: 'Task not found' });

            // Security: Check project membership
            const isMember = await TaskController.verifyMembership(user.id, details.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            const isPM = await isProjectManager(user.id, user.role, details.projectId);

            const { title, description, status, priority, assigneeId, isMilestone, dueDate } = req.body;

            // RBAC: If not PM/Owner, only allow status updates on tasks assigned to them
            if (!isPM) {
                // Employee can only update status of their own assigned tasks
                if (details.assigneeId !== user.id) {
                    return res.status(403).json({ message: 'Access denied: You can only update tasks assigned to you' });
                }
                // Only allow status field
                if (title || description !== undefined || priority || assigneeId !== undefined || isMilestone !== undefined || dueDate) {
                    return res.status(403).json({ message: 'Access denied: Employees can only update the status of their assigned tasks' });
                }
                // Cannot transition out of review/done/approved/rejected without PM approval
                if (details.status === 'in_review' || details.status === 'review' || details.status === 'approved' || details.status === 'done' || details.status === 'rejected') {
                    return res.status(403).json({ message: 'Access denied: Only project managers can transition tasks from this status' });
                }
                // Cannot set status to approved, rejected, or done directly
                if (status === 'approved' || status === 'rejected' || status === 'done') {
                    return res.status(403).json({ message: 'Access denied: Only project managers can approve/complete tasks' });
                }
            }

            const updated = await TaskService.updateTask(taskId, {
                title: title ? title.trim() : undefined,
                description: description !== undefined ? description : undefined,
                status: status || undefined,
                priority: priority || undefined,
                assigneeId: assigneeId !== undefined ? (assigneeId ? parseInt(assigneeId, 10) : null) : undefined,
                isMilestone: isMilestone !== undefined ? !!isMilestone : undefined,
                dueDate: dueDate ? new Date(dueDate) : undefined,
            });

            if (user.activeWorkspaceId) {
                const projectDetails = await ProjectService.getProjectDetails(updated.projectId);

                // If assignee changed, send unified notification
                if (assigneeId !== undefined && assigneeId !== details.assigneeId && updated.assigneeId) {
                    await NotificationService.dispatch({
                        event: 'task.assigned',
                        userId: updated.assigneeId,
                        workspaceId: user.activeWorkspaceId,
                        entityType: 'task',
                        entityId: updated.id,
                        title: `New Task Assigned: ${updated.title}`,
                        message: `You have been assigned task "${updated.title}" in project ${projectDetails?.name || 'Unknown'}.`,
                        link: `/tasks/${updated.id}`,
                        emailTemplate: 'taskAssigned',
                        emailData: {
                            taskTitle: updated.title,
                            projectName: projectDetails?.name || 'Unknown Project',
                            priority: updated.priority || 'medium',
                            estimatedHours: updated.estimatedHours || null,
                            link: `/tasks/${updated.id}`,
                        },
                    });
                }

                // If status is changed to completed (done) and it is milestone
                if (status === 'done' && details.status !== 'done' && updated.isMilestone) {
                    const ownerMember = projectDetails?.members?.find((m: any) => m.role === 'owner');
                    const [ownerUser] = ownerMember ? await db.select().from(users).where(eq(users.id, ownerMember.id)) : [null];
                    if (ownerUser) {
                        await EmailTriggerService.sendMilestoneAchieved(
                            ownerUser.email,
                            ownerUser.name,
                            updated.title,
                            projectDetails?.name || 'Project',
                            user.activeWorkspaceId
                        );
                    }
                }

                // Socket broadcast
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'updated', taskId: updated.id, projectId: updated.projectId });
            }

            return res.status(200).json({ message: 'Task updated successfully', task: updated });
        } catch (error) {
            console.error('Error in updateTask:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Delete task (PM/Owner only)
    static async deleteTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const taskId = parseInt(req.params.id, 10);
            if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid Task ID' });

            const details = await TaskService.getTaskDetails(taskId);
            if (!details) return res.status(404).json({ message: 'Task not found' });

            // Security: Only PMs/Owners can delete tasks
            const isPM = await isProjectManager(user.id, user.role, details.projectId);
            if (!isPM) {
                return res.status(403).json({ message: 'Access denied: Only project managers or workspace owners can delete tasks' });
            }

            await TaskService.deleteTask(taskId);

            // Socket broadcast
            if (user.activeWorkspaceId) {
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'deleted', taskId, projectId: details.projectId });
            }

            return res.status(200).json({ message: 'Task deleted successfully' });
        } catch (error) {
            console.error('Error in deleteTask:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Approve task (PM/Owner only)
    static async approveTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const taskId = parseInt(req.params.id, 10);
            if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid Task ID' });

            const details = await TaskService.getTaskDetails(taskId);
            if (!details) return res.status(404).json({ message: 'Task not found' });

            // Only PM/Owner can approve
            const isPM = await isProjectManager(user.id, user.role, details.projectId);
            if (!isPM) {
                return res.status(403).json({ message: 'Access denied: Only project managers can approve tasks' });
            }

            if (details.status !== 'in_review' && details.status !== 'review') {
                return res.status(400).json({ message: 'Only tasks with status "in_review" or "review" can be approved' });
            }


            const updated = await TaskService.approveTask(taskId);

            // Notify assignee
            if (updated.assigneeId && user.activeWorkspaceId) {
                const [assignee] = await db.select().from(users).where(eq(users.id, updated.assigneeId));
                const projectDetails = await ProjectService.getProjectDetails(updated.projectId);
                if (assignee) {
                    await EmailTriggerService.sendTaskApproved(
                        assignee.email,
                        assignee.name,
                        updated.title,
                        projectDetails?.name || 'Project',
                        user.name,
                        user.activeWorkspaceId
                    );
                    await NotificationService.dispatch({
                        event: 'task.assigned',
                        userId: updated.assigneeId,
                        workspaceId: user.activeWorkspaceId,
                        entityType: 'task',
                        entityId: updated.id,
                        title: 'Task Approved',
                        message: `Your task "${updated.title}" has been approved by ${user.name}.`,
                        link: `/tasks/${updated.id}`,
                        skipEmail: true,
                    });
                }
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'approved', taskId: updated.id, projectId: updated.projectId });
            }

            return res.status(200).json({ message: 'Task approved successfully', task: updated });
        } catch (error) {
            console.error('Error in approveTask:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Reject task (PM/Owner only)
    static async rejectTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const taskId = parseInt(req.params.id, 10);
            if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid Task ID' });

            const { reason } = req.body;

            const details = await TaskService.getTaskDetails(taskId);
            if (!details) return res.status(404).json({ message: 'Task not found' });

            // Only PM/Owner can reject
            const isPM = await isProjectManager(user.id, user.role, details.projectId);
            if (!isPM) {
                return res.status(403).json({ message: 'Access denied: Only project managers can reject tasks' });
            }

            if (details.status !== 'in_review' && details.status !== 'review') {
                return res.status(400).json({ message: 'Only tasks with status "in_review" or "review" can be rejected' });
            }


            const updated = await TaskService.rejectTask(taskId);

            // Notify assignee
            if (updated.assigneeId && user.activeWorkspaceId) {
                const [assignee] = await db.select().from(users).where(eq(users.id, updated.assigneeId));
                const projectDetails = await ProjectService.getProjectDetails(updated.projectId);
                if (assignee) {
                    await EmailTriggerService.sendTaskRejected(
                        assignee.email,
                        assignee.name,
                        updated.title,
                        reason || 'No reason provided',
                        projectDetails?.name || 'Project',
                        user.name,
                        user.activeWorkspaceId
                    );
                    await NotificationService.dispatch({
                        event: 'task.assigned',
                        userId: updated.assigneeId,
                        workspaceId: user.activeWorkspaceId,
                        entityType: 'task',
                        entityId: updated.id,
                        title: 'Task Rejected',
                        message: `Your task "${updated.title}" has been rejected by ${user.name}. Reason: ${reason || 'No reason provided'}`,
                        link: `/tasks/${updated.id}`,
                        skipEmail: true,
                    });
                }
                socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'rejected', taskId: updated.id, projectId: updated.projectId });
            }

            return res.status(200).json({ message: 'Task rejected', task: updated });
        } catch (error) {
            console.error('Error in rejectTask:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // ==========================================
    // SUBTASKS ROUTE HANDLERS
    // ==========================================
    static async createSubtask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);
            if (isNaN(taskId)) {
                return res.status(400).json({ message: 'Invalid Task ID' });
            }
            const { title } = req.body;

            if (!title) return res.status(400).json({ message: 'Subtask title is required' });

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isMember = await TaskController.verifyMembership(user.id, task.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            const sub = await TaskService.createSubtask({
                taskId,
                title: title.trim(),
                isCompleted: false
            });

            return res.status(201).json({ message: 'Subtask added successfully', subtask: sub });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async updateSubtask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const subtaskId = parseInt(req.params.subtaskId, 10);
            const { title, isCompleted } = req.body;

            const [sub] = await db.select().from(subtasks).where(eq(subtasks.id, subtaskId));
            if (!sub) return res.status(404).json({ message: 'Subtask not found' });

            const task = await TaskService.getTaskDetails(sub.taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isMember = await TaskController.verifyMembership(user.id, task.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            const updated = await TaskService.updateSubtask(subtaskId, {
                title: title ? title.trim() : undefined,
                isCompleted: isCompleted !== undefined ? !!isCompleted : undefined
            });

            return res.status(200).json({ message: 'Subtask updated successfully', subtask: updated });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async deleteSubtask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const subtaskId = parseInt(req.params.subtaskId, 10);

            const [sub] = await db.select().from(subtasks).where(eq(subtasks.id, subtaskId));
            if (!sub) return res.status(404).json({ message: 'Subtask not found' });

            const task = await TaskService.getTaskDetails(sub.taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isMember = await TaskController.verifyMembership(user.id, task.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            await TaskService.deleteSubtask(subtaskId);
            return res.status(200).json({ message: 'Subtask deleted successfully' });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // ==========================================
    // COMMENTS ROUTE HANDLERS
    // ==========================================
    static async createComment(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);
            const { content } = req.body;

            if (!content) return res.status(400).json({ message: 'Comment content is required' });

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isMember = await TaskController.verifyMembership(user.id, task.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            const comment = await TaskService.createComment({
                taskId,
                userId: user.id,
                content: content.trim()
            });

            // Notify task assignee about comment if different from commenter
            if (task.assigneeId && task.assigneeId !== user.id) {
                await NotificationService.dispatch({
                    event: 'task.comment',
                    userId: task.assigneeId,
                    entityType: 'task',
                    entityId: taskId,
                    title: `New Comment on: ${task.title}`,
                    message: `${user.name} commented on your task: "${content.trim().substring(0, 80)}${content.length > 80 ? '...' : ''}"`,
                    link: `/tasks/${taskId}`,
                    emailTemplate: 'taskComment',
                    emailData: {
                        taskTitle: task.title,
                        commentText: content.trim().substring(0, 200),
                        authorName: user.name,
                        link: `/tasks/${taskId}`,
                    },
                });
            }

            return res.status(201).json({ message: 'Comment posted successfully', comment });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async deleteComment(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const commentId = parseInt(req.params.commentId, 10);

            const [com] = await db.select().from(comments).where(eq(comments.id, commentId));
            if (!com) return res.status(404).json({ message: 'Comment not found' });

            // Security: Only comment author can delete their comment
            if (com.userId !== user.id) {
                return res.status(403).json({ message: 'Cannot delete someone else\'s comment' });
            }

            await TaskService.deleteComment(commentId);
            return res.status(200).json({ message: 'Comment deleted successfully' });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // ==========================================
    // ATTACHMENTS ROUTE HANDLERS
    // ==========================================
    static async createAttachment(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);
            const { fileName, fileUrl, fileSize, fileType } = req.body;

            if (!fileName || !fileUrl) {
                return res.status(400).json({ message: 'File name and URL are required' });
            }

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isMember = await TaskController.verifyMembership(user.id, task.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            const att = await TaskService.createAttachment({
                taskId,
                userId: user.id,
                fileName,
                fileUrl,
                fileSize: fileSize || null,
                fileType: fileType || null
            });

            return res.status(201).json({ message: 'Attachment uploaded successfully', attachment: att });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async deleteAttachment(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const attachmentId = parseInt(req.params.attachmentId, 10);

            const [att] = await db.select().from(attachments).where(eq(attachments.id, attachmentId));
            if (!att) return res.status(404).json({ message: 'Attachment not found' });

            const task = await TaskService.getTaskDetails(att.taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isMember = await TaskController.verifyMembership(user.id, task.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            // If the attachment has a fileId in the URL hash, delete it from ImageKit
            if (att.fileUrl && att.fileUrl.includes('#')) {
                const fileId = att.fileUrl.split('#')[1];
                if (fileId) {
                    try {
                        await imagekit.deleteFile(fileId);
                    } catch (err) {
                        console.error('Failed to delete attachment from ImageKit:', err);
                    }
                }
            }

            await TaskService.deleteAttachment(attachmentId);
            return res.status(200).json({ message: 'Attachment deleted successfully' });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // LOCK & UNLOCK
    static async lockTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);
            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isPM = await isProjectManager(user.id, user.role, task.projectId);
            if (!isPM && task.assigneeId !== user.id) {
                return res.status(403).json({ message: 'Access denied: Only project managers or assignee can lock a task' });
            }

            const updated = await TaskService.lockTask(taskId, user.id);

            // Notify assignee
            if (task.assigneeId && task.assigneeId !== user.id) {
                await NotificationService.dispatch({
                    event: 'task.assigned',
                    userId: task.assigneeId,
                    workspaceId: user.activeWorkspaceId,
                    entityType: 'task',
                    entityId: task.id,
                    title: 'Task Locked',
                    message: `Task "${task.title}" has been locked by ${user.name}.`,
                    link: `/tasks/${task.id}`,
                    skipEmail: true,
                });
                const [assigneeUser] = await db.select().from(users).where(eq(users.id, task.assigneeId));
                if (assigneeUser) {
                    await EmailTriggerService.sendTaskLockedAlert(assigneeUser.email, assigneeUser.name, task.title, user.name, user.activeWorkspaceId || 0);
                }
            }

            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'locked', taskId, projectId: task.projectId });
            return res.status(200).json({ message: 'Task locked successfully', task: updated });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async unlockTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);
            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isPM = await isProjectManager(user.id, user.role, task.projectId);
            if (!isPM && task.lockedById !== user.id) {
                return res.status(403).json({ message: 'Access denied: Only project managers or the locker can unlock a task' });
            }

            const updated = await TaskService.unlockTask(taskId, user.id);

            // Notify assignee
            if (task.assigneeId && task.assigneeId !== user.id) {
                await NotificationService.dispatch({
                    event: 'task.assigned',
                    userId: task.assigneeId,
                    workspaceId: user.activeWorkspaceId,
                    entityType: 'task',
                    entityId: task.id,
                    title: 'Task Unlocked',
                    message: `Task "${task.title}" has been unlocked by ${user.name}.`,
                    link: `/tasks/${task.id}`,
                    skipEmail: true,
                });
                const [assigneeUser] = await db.select().from(users).where(eq(users.id, task.assigneeId));
                if (assigneeUser) {
                    await EmailTriggerService.sendTaskUnlockedAlert(assigneeUser.email, assigneeUser.name, task.title, user.name, user.activeWorkspaceId || 0);
                }
            }

            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'unlocked', taskId, projectId: task.projectId });
            return res.status(200).json({ message: 'Task unlocked successfully', task: updated });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // WATCHERS
    static async watchTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);
            const { role } = req.body;

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const watcher = await TaskService.watchTask(taskId, user.id, role || 'watcher');
            return res.status(200).json({ message: 'Task watched successfully', watcher });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async unwatchTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            await TaskService.unwatchTask(taskId, user.id);
            return res.status(200).json({ message: 'Task unwatched successfully' });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // UNDO & REDO
    static async undoChange(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isMember = await TaskController.verifyMembership(user.id, task.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            const updated = await TaskService.undoChange(taskId, user.id);
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'updated', taskId, projectId: task.projectId });
            return res.status(200).json({ message: 'Undo successful', task: updated });
        } catch (error: any) {
            return res.status(400).json({ message: error.message || 'Undo failed' });
        }
    }

    static async redoChange(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isMember = await TaskController.verifyMembership(user.id, task.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            const updated = await TaskService.redoChange(taskId, user.id);
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'updated', taskId, projectId: task.projectId });
            return res.status(200).json({ message: 'Redo successful', task: updated });
        } catch (error: any) {
            return res.status(400).json({ message: error.message || 'Redo failed' });
        }
    }

    // ARCHIVE & RESTORE
    static async archiveTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isPM = await isProjectManager(user.id, user.role, task.projectId);
            if (!isPM) return res.status(403).json({ message: 'Access denied: Only project managers can archive tasks' });

            const archived = await TaskService.archiveTask(taskId, user.id);
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'archived', taskId, projectId: task.projectId });
            return res.status(200).json({ message: 'Task archived successfully', task: archived });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async restoreTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isPM = await isProjectManager(user.id, user.role, task.projectId);
            if (!isPM) return res.status(403).json({ message: 'Access denied: Only project managers can restore tasks' });

            const restored = await TaskService.restoreTask(taskId, user.id);
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'restored', taskId, projectId: task.projectId });
            return res.status(200).json({ message: 'Task restored successfully', task: restored });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // DUPLICATE & CLONE
    static async duplicateTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isMember = await TaskController.verifyMembership(user.id, task.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            const duplicated = await TaskService.duplicateTask(taskId, user.id);
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'created', taskId: duplicated.id, projectId: task.projectId });
            return res.status(201).json({ message: 'Task duplicated successfully', task: duplicated });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // TIMERS & POMODORO
    static async startTimer(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isAssignee = task.assigneeId === user.id;
            const isPM = await isProjectManager(user.id, user.role, task.projectId);
            if (!isAssignee && !isPM) return res.status(403).json({ message: 'Access denied: Only assignee can track time' });

            const updated = await TaskService.startTimer(taskId, user.id);
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'timer_started', taskId, projectId: task.projectId });
            return res.status(200).json({ message: 'Timer started', task: updated });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async stopTimer(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const isAssignee = task.assigneeId === user.id;
            const isPM = await isProjectManager(user.id, user.role, task.projectId);
            if (!isAssignee && !isPM) return res.status(403).json({ message: 'Access denied' });

            const updated = await TaskService.stopTimer(taskId, user.id);
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'timer_stopped', taskId, projectId: task.projectId });
            return res.status(200).json({ message: 'Timer stopped', task: updated });
        } catch (error: any) {
            return res.status(400).json({ message: error.message || 'Failed to stop timer' });
        }
    }

    static async startPomodoro(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const updated = await TaskService.startPomodoro(taskId, user.id);
            return res.status(200).json({ message: 'Pomodoro focus timer started', task: updated });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async stopPomodoro(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            const task = await TaskService.getTaskDetails(taskId);
            if (!task) return res.status(404).json({ message: 'Task not found' });

            const updated = await TaskService.stopPomodoro(taskId, user.id);

            // Send notification
            await NotificationService.dispatch({
                event: 'task.assigned',
                userId: user.id,
                workspaceId: user.activeWorkspaceId,
                entityType: 'task',
                entityId: task.id,
                title: '🍅 Pomodoro Finished',
                message: `Pomodoro session finished for task "${task.title}".`,
                link: `/tasks/${task.id}`,
                skipEmail: true,
            });
            await EmailTriggerService.sendPomodoroCompletedAlert(user.email, user.name, task.title, updated.pomodoroCount, user.activeWorkspaceId || 0);

            return res.status(200).json({ message: 'Pomodoro focus timer finished', task: updated });
        } catch (error: any) {
            return res.status(400).json({ message: error.message || 'Failed to stop Pomodoro' });
        }
    }

    // BULK OPERATIONS
    static async bulkUpdate(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { taskIds, updates } = req.body;

            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({ message: 'taskIds array is required' });
            }

            const updated = await TaskService.bulkUpdate(taskIds, updates, user.id);
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'bulk_updated', taskIds });
            return res.status(200).json({ message: 'Bulk update successful', tasks: updated });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async bulkDelete(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { taskIds } = req.body;

            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({ message: 'taskIds array is required' });
            }

            await TaskService.bulkDelete(taskIds, user.id);
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'bulk_deleted', taskIds });
            return res.status(200).json({ message: 'Bulk delete successful' });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // TEMPLATES
    static async createTemplate(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { title, description, priority, workType, estimatedHours, labels, category } = req.body;

            if (!user.activeWorkspaceId) return res.status(400).json({ message: 'Active workspace is required' });
            if (!title) return res.status(400).json({ message: 'Template title is required' });

            const tpl = await TaskService.createTemplate(user.activeWorkspaceId, {
                title, description, priority, workType, estimatedHours, labels, category
            });

            return res.status(201).json({ message: 'Task template created successfully', template: tpl });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async getTemplates(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user.activeWorkspaceId) return res.status(400).json({ message: 'Active workspace is required' });

            const templates = await TaskService.getTemplates(user.activeWorkspaceId);
            return res.status(200).json(templates);
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async applyTemplate(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const templateId = parseInt(req.params.templateId, 10);
            const { projectId } = req.body;

            if (!projectId) return res.status(400).json({ message: 'Project ID is required' });

            const isPM = await isProjectManager(user.id, user.role, parseInt(projectId, 10));
            if (!isPM) return res.status(403).json({ message: 'Access denied' });

            const task = await TaskService.applyTemplate(templateId, parseInt(projectId, 10), user.id);
            socketService.broadcastToWorkspace(user.activeWorkspaceId, 'task_updated', { action: 'created', taskId: task.id, projectId });
            return res.status(201).json({ message: 'Template applied successfully', task });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // AI & RISK PREDICTIONS
    static async getTaskAIScores(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const taskId = parseInt(req.params.id, 10);

            const details = await TaskService.getTaskDetails(taskId);
            if (!details) return res.status(404).json({ message: 'Task not found' });

            const isMember = await TaskController.verifyMembership(user.id, details.projectId);
            if (!isMember) return res.status(403).json({ message: 'Access denied' });

            const scores = await ProjectIntelligenceService.calculateTaskRiskAndAIScores(taskId);
            return res.status(200).json(scores);
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}
