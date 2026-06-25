import { db } from '../db/index';
import { eq, and, inArray } from 'drizzle-orm';
import { tasks, projects, projectMembers, subtasks, comments, attachments, users } from '../db/schema';
import type { Task, NewTask, NewSubtask, NewComment, NewAttachment } from '../db/schema';

export class TaskService {
    // Fetch all tasks for projects where the user is a member/owner
    static async getUserTasks(userId: number, filters?: { projectId?: number; status?: string; priority?: string }) {
        // Find projects user belongs to
        const memberships = await db.select({
            projectId: projectMembers.projectId
        })
        .from(projectMembers)
        .where(eq(projectMembers.userId, userId));

        if (memberships.length === 0) return [];

        const projectIds = memberships.map((m) => m.projectId);

        // Build base query
        let query = db.select({
            task: tasks,
            projectName: projects.name
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(inArray(tasks.projectId, projectIds));

        // Execute query and filter in memory or extend Drizzle conditions
        const results = await query;
        let filtered = results.map(r => ({
            ...r.task,
            projectName: r.projectName
        }));

        if (filters) {
            if (filters.projectId) {
                filtered = filtered.filter(f => f.projectId === filters.projectId);
            }
            if (filters.status) {
                filtered = filtered.filter(f => f.status === filters.status);
            }
            if (filters.priority) {
                filtered = filtered.filter(f => f.priority === filters.priority);
            }
        }

        return filtered;
    }

    // Get detailed view of task including project details, subtasks, comments, and attachments
    static async getTaskDetails(taskId: number) {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
        if (!task) return null;

        const [project] = await db.select().from(projects).where(eq(projects.id, task.projectId));

        // Fetch subtasks
        const taskSubtasks = await db.select().from(subtasks).where(eq(subtasks.taskId, taskId));

        // Fetch comments with author names
        const taskComments = await db.select({
            id: comments.id,
            content: comments.content,
            userId: comments.userId,
            userName: users.name,
            createdAt: comments.createdAt,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.taskId, taskId));

        // Fetch attachments
        const taskAttachments = await db.select().from(attachments).where(eq(attachments.taskId, taskId));

        // Fetch assignee details if any
        let assignee = null;
        if (task.assigneeId) {
            const [user] = await db.select({
                id: users.id,
                name: users.name,
                email: users.email
            }).from(users).where(eq(users.id, task.assigneeId));
            assignee = user || null;
        }

        return {
            ...task,
            project,
            assignee,
            subtasks: taskSubtasks,
            comments: taskComments,
            attachments: taskAttachments
        };
    }

    // Create a new task
    static async createTask(data: NewTask) {
        const [task] = await db.insert(tasks).values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();
        return task;
    }

    // Update task
    static async updateTask(taskId: number, data: Partial<NewTask>) {
        const [task] = await db.update(tasks)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId))
            .returning();
        return task;
    }

    // Delete task
    static async deleteTask(taskId: number) {
        const [deleted] = await db.delete(tasks)
            .where(eq(tasks.id, taskId))
            .returning();
        return deleted;
    }

    // ==========================================
    // SUBTASKS OPERATIONS
    // ==========================================
    static async createSubtask(data: NewSubtask) {
        const [sub] = await db.insert(subtasks).values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();
        return sub;
    }

    static async updateSubtask(subtaskId: number, data: Partial<NewSubtask>) {
        const [sub] = await db.update(subtasks)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(subtasks.id, subtaskId))
            .returning();
        return sub;
    }

    static async deleteSubtask(subtaskId: number) {
        const [deleted] = await db.delete(subtasks)
            .where(eq(subtasks.id, subtaskId))
            .returning();
        return deleted;
    }

    // ==========================================
    // COMMENTS OPERATIONS
    // ==========================================
    static async createComment(data: NewComment) {
        const [com] = await db.insert(comments).values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        // Fetch back with author details
        const [commentWithAuthor] = await db.select({
            id: comments.id,
            content: comments.content,
            userId: comments.userId,
            userName: users.name,
            createdAt: comments.createdAt
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, com.id));

        return commentWithAuthor;
    }

    static async deleteComment(commentId: number) {
        const [deleted] = await db.delete(comments)
            .where(eq(comments.id, commentId))
            .returning();
        return deleted;
    }

    // ==========================================
    // ATTACHMENTS OPERATIONS
    // ==========================================
    static async createAttachment(data: NewAttachment) {
        const [att] = await db.insert(attachments).values({
            ...data,
            createdAt: new Date()
        }).returning();
        return att;
    }

    static async deleteAttachment(attachmentId: number) {
        const [deleted] = await db.delete(attachments)
            .where(eq(attachments.id, attachmentId))
            .returning();
        return deleted;
    }
}
