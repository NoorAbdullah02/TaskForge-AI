import type { Request, Response } from 'express';
import { TaskService } from '../services/task.service';
import { ProjectService } from '../services/project.service';
import { db } from '../db/index';
import { eq } from 'drizzle-orm';
import { subtasks, comments, attachments, users } from '../db/schema';
import { imagekit } from '../lib/imagekit';
import { EmailTriggerService } from '../services/emailTrigger.service';


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

    // Create a new task
    static async createTask(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { projectId, title, description, status, priority, assigneeId, isMilestone, dueDate, workType } = req.body;
            if (!projectId) return res.status(400).json({ message: 'Project ID is required' });
            if (!title || title.trim().length === 0) return res.status(400).json({ message: 'Title is required' });

            // Security: Check project membership
            const isMember = await TaskController.verifyMembership(user.id, parseInt(projectId, 10));
            if (!isMember) return res.status(403).json({ message: 'Access denied: Not a member of this project' });

            const task = await TaskService.createTask({
                projectId: parseInt(projectId, 10),
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
                    await EmailTriggerService.sendTaskAssigned(
                        targetUser.email,
                        targetUser.name,
                        task.title,
                        projectDetails?.name || 'Project',
                        user.activeWorkspaceId
                    );
                }
            }

            return res.status(201).json({ message: 'Task created successfully', task });
        } catch (error) {
            console.error('Error in createTask:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Update task
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

            const { title, description, status, priority, assigneeId, isMilestone, dueDate } = req.body;
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
                
                // If assignee changed, send task assigned email
                if (assigneeId !== undefined && assigneeId !== details.assigneeId && updated.assigneeId) {
                    const [targetUser] = await db.select().from(users).where(eq(users.id, updated.assigneeId));
                    if (targetUser) {
                        await EmailTriggerService.sendTaskAssigned(
                            targetUser.email,
                            targetUser.name,
                            updated.title,
                            projectDetails?.name || 'Project',
                            user.activeWorkspaceId
                        );
                    }
                }
                
                // If status is changed to completed (done) and it is milestone
                if (status === 'done' && details.status !== 'done' && updated.isMilestone) {
                    const [ownerUser] = await db.select().from(users).where(eq(users.id, projectDetails?.ownerId || 0));
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
            }

            return res.status(200).json({ message: 'Task updated successfully', task: updated });
        } catch (error) {
            console.error('Error in updateTask:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // Delete task
    static async deleteTask(req: Request, res: Response) {
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

            await TaskService.deleteTask(taskId);
            return res.status(200).json({ message: 'Task deleted successfully' });
        } catch (error) {
            console.error('Error in deleteTask:', error);
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
}
