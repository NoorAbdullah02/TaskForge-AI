import { db } from '../db/index';
import { eq, and, sql, ne } from 'drizzle-orm';
import { projects, projectMembers, tasks, users, projectDocuments, epics, stories, sprints } from '../db/schema';
import type { Project, NewProject, Task, NewTask } from '../db/schema';

export class ProjectService {
    // Fetch all projects in workspace with optional search, filter, pagination, and role-based access
    static async getUserProjects(
        userId: number,
        workspaceId: number,
        workspaceRole: string,
        filters: {
            search?: string;
            status?: string;
            isArchived?: boolean;
            departmentId?: number;
            page?: number;
            limit?: number;
        } = {}
    ) {
        const isOwner = workspaceRole === 'owner' || workspaceRole === 'admin' || workspaceRole === 'super_admin';
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const offset = (page - 1) * limit;

        const conditions: any[] = [eq(projects.workspaceId, workspaceId)];

        if (filters.isArchived !== undefined) {
            conditions.push(eq(projects.isArchived, filters.isArchived));
        }

        if (filters.status) {
            conditions.push(eq(projects.status, filters.status));
        }

        if (filters.departmentId) {
            conditions.push(eq(projects.departmentId, filters.departmentId));
        }

        if (filters.search) {
            conditions.push(sql`(${projects.name} ILIKE ${'%' + filters.search + '%'} OR ${projects.description} ILIKE ${'%' + filters.search + '%'})`);
        }

        let projectList;
        let totalCount = 0;

        const whereClause = and(...conditions);

        if (isOwner) {
            // Get count
            const [countRes] = await db.select({ count: sql<number>`count(*)` })
                .from(projects)
                .where(whereClause);
            totalCount = Number(countRes?.count || 0);

            if (filters.page === undefined) {
                const list = await db.select().from(projects).where(whereClause);
                return list.map(p => ({ ...p, userRole: 'owner' }));
            }

            projectList = await db.select()
                .from(projects)
                .where(whereClause)
                .limit(limit)
                .offset(offset);
            
            projectList = projectList.map(p => ({ ...p, userRole: 'owner' }));
        } else {
            // Join with projectMembers
            const memberWhereClause = and(
                eq(projectMembers.userId, userId),
                ...conditions
            );

            const [countRes] = await db.select({ count: sql<number>`count(*)` })
                .from(projectMembers)
                .innerJoin(projects, eq(projectMembers.projectId, projects.id))
                .where(memberWhereClause);
            totalCount = Number(countRes?.count || 0);

            if (filters.page === undefined) {
                const list = await db.select({
                    project: projects,
                    role: projectMembers.role
                })
                .from(projectMembers)
                .innerJoin(projects, eq(projectMembers.projectId, projects.id))
                .where(memberWhereClause);
                return list.map(m => ({ ...m.project, userRole: m.role }));
            }

            const results = await db.select({
                project: projects,
                role: projectMembers.role
            })
            .from(projectMembers)
            .innerJoin(projects, eq(projectMembers.projectId, projects.id))
            .where(memberWhereClause)
            .limit(limit)
            .offset(offset);

            projectList = results.map(r => ({
                ...r.project,
                userRole: r.role
            }));
        }

        return {
            projects: projectList,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit)
            }
        };
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

        // Fetch tasks with assignee details
        const projectTasksRaw = await db.select({
            task: tasks,
            assigneeName: users.name,
            assigneeEmail: users.email,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .where(eq(tasks.projectId, projectId));

        const projectTasks = projectTasksRaw.map(r => ({
            ...r.task,
            assigneeName: r.assigneeName,
            assigneeEmail: r.assigneeEmail,
        }));

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
        workTypes?: string;
        workspaceId: number;
        password?: string;
    }) {
        return db.transaction(async (tx) => {
            const inviteCode = 'PROJ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const inviteLink = `http://localhost:5173/projects/join?code=${inviteCode}`;

            const [project] = await tx.insert(projects).values({
                workspaceId: data.workspaceId,
                name: data.name,
                description: data.description || null,
                departmentId: data.departmentId || null,
                status: "planning",
                workTypes: data.workTypes || "task",
                startDate: data.startDate || null,
                endDate: data.endDate || null,
                password: data.password || null,
                inviteCode,
                inviteLink,
                isArchived: false
            }).returning();

            await tx.insert(projectMembers).values({
                projectId: project.id,
                userId: data.ownerId,
                role: 'owner',
            });

            return project;
        });
    }

    // Duplicate/Clone a project
    static async duplicateProject(projectId: number, newName: string, userId: number, activeWorkspaceId: number) {
        return db.transaction(async (tx) => {
            const [srcProject] = await tx.select().from(projects).where(eq(projects.id, projectId));
            if (!srcProject) throw new Error('Source project not found');

            const inviteCode = 'PROJ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const inviteLink = `http://localhost:5173/projects/join?code=${inviteCode}`;

            // 1. Create duplicate project record
            const [newProject] = await tx.insert(projects).values({
                workspaceId: activeWorkspaceId,
                name: newName || `${srcProject.name} (Copy)`,
                description: srcProject.description,
                departmentId: srcProject.departmentId,
                status: 'planning',
                workTypes: srcProject.workTypes,
                startDate: srcProject.startDate,
                endDate: srcProject.endDate,
                password: srcProject.password,
                inviteCode,
                inviteLink,
                isArchived: false,
                clonedFromId: projectId,
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();

            // 2. Assign the creator as owner in projectMembers
            await tx.insert(projectMembers).values({
                projectId: newProject.id,
                userId: userId,
                role: 'owner',
                joinedAt: new Date()
            });

            // 3. Clone Epics, Stories, Sprints
            const epicsList = await tx.select().from(epics).where(eq(epics.projectId, projectId));
            for (const epic of epicsList) {
                const [newEpic] = await tx.insert(epics).values({
                    projectId: newProject.id,
                    name: epic.name,
                    description: epic.description,
                    status: epic.status,
                    startDate: epic.startDate,
                    endDate: epic.endDate
                }).returning();

                // Copy stories inside this epic
                const storiesList = await tx.select().from(stories).where(eq(stories.epicId, epic.id));
                for (const story of storiesList) {
                    await tx.insert(stories).values({
                        epicId: newEpic.id,
                        name: story.name,
                        description: story.description,
                        status: story.status,
                        points: story.points
                    });
                }
            }

            // Copy sprints
            const sprintsList = await tx.select().from(sprints).where(eq(sprints.projectId, projectId));
            for (const sprint of sprintsList) {
                await tx.insert(sprints).values({
                    projectId: newProject.id,
                    name: sprint.name,
                    startDate: sprint.startDate,
                    endDate: sprint.endDate,
                    status: 'future',
                    goal: sprint.goal
                });
            }

            // Copy project members (excluding the owner who is already added)
            const membersList = await tx.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectId), ne(projectMembers.userId, userId)));
            for (const member of membersList) {
                await tx.insert(projectMembers).values({
                    projectId: newProject.id,
                    userId: member.userId,
                    role: member.role,
                    joinedAt: new Date()
                });
            }

            return newProject;
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
