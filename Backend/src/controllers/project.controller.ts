import type { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { getUserByEmail } from '../db/queries';
import { db } from '../db/index';
import { eq } from 'drizzle-orm';
import { projectDocuments } from '../db/schema';
import { imagekit } from '../lib/imagekit';
import { EmailTriggerService } from '../services/emailTrigger.service';


export class ProjectController {
    // Get all projects for current user
    static async getUserProjects(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const projectsList = await ProjectService.getUserProjects(user.id);
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

            // Security: Check if user is a member of the project
            const isMember = details.members.some((m) => m.id === user.id);
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

            const { name, description, startDate, endDate, workTypes } = req.body;
            if (!name || name.trim().length === 0) {
                return res.status(400).json({ message: 'Project name is required' });
            }

            const project = await ProjectService.createProject({
                name: name.trim(),
                description,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                ownerId: user.id,
                workTypes: workTypes || 'task',
            });

            if (user.activeWorkspaceId) {
                await EmailTriggerService.sendProjectCreated(
                    user.email,
                    user.name,
                    project.name,
                    user.workspaceName || 'Your Workspace',
                    user.activeWorkspaceId
                );
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
                    await EmailTriggerService.sendProjectManagerAssigned(
                        targetUser.email,
                        targetUser.name,
                        details.name,
                        user.activeWorkspaceId
                    );
                } else {
                    await EmailTriggerService.sendProjectAssignment(
                        targetUser.email,
                        targetUser.name,
                        details.name,
                        user.activeWorkspaceId
                    );
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

            // Security: Must be project member to create tasks
            const isMember = details.members.some((m) => m.id === user.id);
            if (!isMember) return res.status(403).json({ message: 'Only project members can add tasks' });

            const { title, description, status, priority, assigneeId, isMilestone, dueDate, workType } = req.body;
            if (!title || title.trim().length === 0) {
                return res.status(400).json({ message: 'Task title is required' });
            }

            const task = await ProjectService.createTaskOrMilestone({
                projectId,
                title: title.trim(),
                description,
                status: status || 'todo',
                priority: priority || 'medium',
                workType: workType || 'task',
                assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
                isMilestone: !!isMilestone,
                dueDate: dueDate ? new Date(dueDate) : null,
            });

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

            const { title, description, status, priority, assigneeId, isMilestone, dueDate } = req.body;

            const updated = await ProjectService.updateTaskOrMilestone(taskId, {
                title: title ? title.trim() : undefined,
                description,
                status,
                priority,
                assigneeId: assigneeId !== undefined ? (assigneeId ? parseInt(assigneeId, 10) : null) : undefined,
                isMilestone: isMilestone !== undefined ? !!isMilestone : undefined,
                dueDate: dueDate ? new Date(dueDate) : undefined,
            });

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

            await ProjectService.deleteTaskOrMilestone(taskId);
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
}
