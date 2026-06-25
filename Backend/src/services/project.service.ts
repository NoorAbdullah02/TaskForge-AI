import { db } from '../db/index';
import { eq, and } from 'drizzle-orm';
import { projects, projectMembers, tasks, users, projectDocuments } from '../db/schema';
import type { Project, NewProject, Task, NewTask } from '../db/schema';


export class ProjectService {
    // Fetch all projects where the user is a member or owner
    static async getUserProjects(userId: number) {
        const memberships = await db.select({
            project: projects,
            role: projectMembers.role,
        })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(eq(projectMembers.userId, userId));

        return memberships.map((m) => ({
            ...m.project,
            userRole: m.role,
        }));
    }

    // Fetch details of a single project, including all members, tasks, milestones, and calculated progress
    static async getProjectDetails(projectId: number) {
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
        if (!project) return null;

        // Fetch members
        const membersList = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: projectMembers.role,
            joinedAt: projectMembers.joinedAt,
        })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, projectId));

        // Fetch tasks
        const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));

        // Calculate progress
        const totalTasks = projectTasks.filter(t => !t.isMilestone).length;
        const completedTasks = projectTasks.filter(t => !t.isMilestone && t.status === 'done').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            ...project,
            progress,
            members: membersList,
            tasks: projectTasks,
        };
    }

    // Create a new project and assign the owner in one transaction
    static async createProject(data: {
        name: string;
        description?: string;
        departmentId?: number;
        startDate?: Date;
        endDate?: Date;
        ownerId: number;
    }) {
        return db.transaction(async (tx) => {
            const [project] = await tx.insert(projects).values({
                name: data.name,
                description: data.description || null,
                departmentId: data.departmentId || null,
                startDate: data.startDate || null,
                endDate: data.endDate || null,
            }).returning();

            await tx.insert(projectMembers).values({
                projectId: project.id,
                userId: data.ownerId,
                role: 'owner',
            });

            return project;
        });
    }

    // Update project metadata
    static async updateProject(projectId: number, data: Partial<NewProject>) {
        const [project] = await db.update(projects)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(projects.id, projectId))
            .returning();
        return project;
    }

    // Delete a project (cascade handles project_members, tasks, subtasks, etc.)
    static async deleteProject(projectId: number) {
        const [deleted] = await db.delete(projects)
            .where(eq(projects.id, projectId))
            .returning();
        return deleted;
    }

    // Assign or update a member role in the project
    static async assignMember(projectId: number, userId: number, role: string) {
        // Check if user already in project
        const [existing] = await db.select()
            .from(projectMembers)
            .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

        if (existing) {
            const [updated] = await db.update(projectMembers)
                .set({ role })
                .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
                .returning();
            return updated;
        }

        const [inserted] = await db.insert(projectMembers)
            .values({ projectId, userId, role })
            .returning();
        return inserted;
    }

    // Remove a member from a project
    static async removeMember(projectId: number, userId: number) {
        const [deleted] = await db.delete(projectMembers)
            .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
            .returning();
        return deleted;
    }

    // Task and Milestone creations
    static async createTaskOrMilestone(data: NewTask) {
        const [task] = await db.insert(tasks).values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();
        return task;
    }

    // Update Task or Milestone
    static async updateTaskOrMilestone(taskId: number, data: Partial<NewTask>) {
        const [task] = await db.update(tasks)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId))
            .returning();
        return task;
    }

    // Delete Task or Milestone
    static async deleteTaskOrMilestone(taskId: number) {
        const [deleted] = await db.delete(tasks)
            .where(eq(tasks.id, taskId))
            .returning();
        return deleted;
    }

    // Get all project documents
    static async getProjectDocuments(projectId: number) {
        return db.select()
            .from(projectDocuments)
            .where(eq(projectDocuments.projectId, projectId));
    }

    // Add a project document
    static async createProjectDocument(data: {
        projectId: number;
        userId: number;
        fileName: string;
        fileUrl: string;
        fileSize?: number;
        fileType?: string;
    }) {
        const [inserted] = await db.insert(projectDocuments).values({
            projectId: data.projectId,
            userId: data.userId,
            fileName: data.fileName,
            fileUrl: data.fileUrl,
            fileSize: data.fileSize || null,
            fileType: data.fileType || null,
            createdAt: new Date()
        }).returning();
        return inserted;
    }

    // Delete a project document record
    static async deleteProjectDocument(docId: number) {
        const [deleted] = await db.delete(projectDocuments)
            .where(eq(projectDocuments.id, docId))
            .returning();
        return deleted;
    }
}
