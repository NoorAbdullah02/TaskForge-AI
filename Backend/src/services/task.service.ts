import { db } from '../db/index';
import { eq, and, inArray, desc, SQL, isNull } from 'drizzle-orm';
import { 
    tasks, 
    projects, 
    projectMembers, 
    subtasks, 
    comments, 
    attachments, 
    users,
    taskWatchers,
    taskTemplates,
    taskHistory,
    timeLogs
} from '../db/schema';
import type { 
    Task, 
    NewTask, 
    NewSubtask, 
    NewComment, 
    NewAttachment,
    TaskWatcher,
    NewTaskWatcher,
    TaskTemplate,
    NewTaskTemplate,
    TaskHistory as TaskHistoryType
} from '../db/schema';

export class TaskService {
    // Log changes helper
    static async logChange(taskId: number, userId: number | null, changeType: string, fieldName: string, oldValue: string | null, newValue: string | null) {
        try {
            await db.insert(taskHistory).values({
                taskId,
                userId,
                changeType,
                fieldName,
                oldValue: oldValue || null,
                newValue: newValue || null,
                isUndone: false,
                createdAt: new Date()
            });
        } catch (error) {
            console.error('Error logging task history:', error);
        }
    }

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

        // Build all filter conditions directly in the DB query (no in-memory filtering)
        const conditions: SQL[] = [
            inArray(tasks.projectId, projectIds),
            eq(tasks.isArchived, false)
        ];

        if (filters?.projectId) {
            conditions.push(eq(tasks.projectId, filters.projectId));
        }
        if (filters?.status) {
            conditions.push(eq(tasks.status, filters.status as any));
        }
        if (filters?.priority) {
            conditions.push(eq(tasks.priority, filters.priority as any));
        }

        const results = await db.select({
            task: tasks,
            projectName: projects.name,
            assigneeName: users.name,
            assigneeEmail: users.email
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .where(and(...conditions));

        return results.map(r => ({
            ...r.task,
            projectName: r.projectName,
            assigneeName: r.assigneeName,
            assigneeEmail: r.assigneeEmail
        }));
    }

    // Get detailed view of task including project details, subtasks, comments, and attachments
    static async getTaskDetails(taskId: number) {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
        if (!task) return null;

        // Fetch all related data in parallel — reduces 6 sequential round-trips to 1
        const [project, taskSubtasks, taskComments, taskAttachments, watchersList, historyList, assigneeResult, [activeTimer]] =
            await Promise.all([
                db.select().from(projects).where(eq(projects.id, task.projectId)).then(r => r[0] ?? null),

                db.select().from(subtasks).where(eq(subtasks.taskId, taskId)),

                db.select({
                    id: comments.id,
                    content: comments.content,
                    userId: comments.userId,
                    userName: users.name,
                    createdAt: comments.createdAt,
                })
                .from(comments)
                .innerJoin(users, eq(comments.userId, users.id))
                .where(eq(comments.taskId, taskId)),

                db.select().from(attachments).where(eq(attachments.taskId, taskId)),

                db.select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: taskWatchers.role
                })
                .from(taskWatchers)
                .innerJoin(users, eq(taskWatchers.userId, users.id))
                .where(eq(taskWatchers.taskId, taskId)),

                db.select({
                    id: taskHistory.id,
                    userName: users.name,
                    fieldName: taskHistory.fieldName,
                    oldValue: taskHistory.oldValue,
                    newValue: taskHistory.newValue,
                    changeType: taskHistory.changeType,
                    createdAt: taskHistory.createdAt
                })
                .from(taskHistory)
                .leftJoin(users, eq(taskHistory.userId, users.id))
                .where(eq(taskHistory.taskId, taskId))
                .orderBy(desc(taskHistory.createdAt)),

                // Conditionally fetch assignee — resolves to null if no assigneeId
                task.assigneeId
                    ? db.select({ id: users.id, name: users.name, email: users.email })
                        .from(users).where(eq(users.id, task.assigneeId)).then(r => r[0] ?? null)
                    : Promise.resolve(null),

                // Fetch active timer log if any
                db.select().from(timeLogs).where(
                    and(
                        eq(timeLogs.taskId, taskId),
                        isNull(timeLogs.endTime)
                    )
                ).limit(1)
            ]);

        let timerStatus = null;
        let timerElapsedSeconds = 0;
        let isTimerActive = task.isTimerActive;

        if (activeTimer) {
            timerStatus = activeTimer.status;
            isTimerActive = true;
            
            const now = new Date();
            const start = activeTimer.startTime.getTime();
            let pausedMs = activeTimer.totalPausedSeconds * 1000;
            if (activeTimer.status === 'paused' && activeTimer.pausedAt) {
                pausedMs += now.getTime() - activeTimer.pausedAt.getTime();
            }
            const elapsedMs = now.getTime() - start - pausedMs;
            timerElapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));
        }

        return {
            ...task,
            isTimerActive,
            timerStatus,
            timerElapsedSeconds,
            project,
            assignee: assigneeResult,
            subtasks: taskSubtasks,
            comments: taskComments,
            attachments: taskAttachments,
            watchers: watchersList,
            history: historyList
        };
    }

    // Create a new task
    static async createTask(data: NewTask, userId?: number) {
        const [task] = await db.insert(tasks).values({
            ...data,
            isRecurring: data.isRecurring || false,
            recurrenceCron: data.recurrenceCron || null,
            labels: data.labels || null,
            category: data.category || null,
            estimatedHours: data.estimatedHours || null,
            actualHours: data.actualHours || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        // Log history
        await TaskService.logChange(task.id, userId || null, 'create', 'task', null, task.title);

        return task;
    }

    // Update task
    static async updateTask(taskId: number, data: Partial<NewTask>, userId?: number) {
        // Fetch current details for change logging
        const [current] = await db.select().from(tasks).where(eq(tasks.id, taskId));
        if (!current) throw new Error("Task not found");

        if (current.isLocked && userId && current.lockedById !== userId) {
            throw new Error("Task is locked. Only the user who locked it or project managers can modify it.");
        }

        const [task] = await db.update(tasks)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId))
            .returning();

        // Log history changes
        const typedCurrent = current as any;
        const typedData = data as any;
        for (const key of Object.keys(data)) {
            const oldVal = typedCurrent[key];
            const newVal = typedData[key];
            if (oldVal !== newVal && newVal !== undefined) {
                await TaskService.logChange(
                    taskId, 
                    userId || null, 
                    'update', 
                    key, 
                    oldVal !== null ? String(oldVal) : null, 
                    newVal !== null ? String(newVal) : null
                );
            }
        }

        return task;
    }

    // Delete task
    static async deleteTask(taskId: number, userId?: number) {
        const [deleted] = await db.delete(tasks)
            .where(eq(tasks.id, taskId))
            .returning();
        
        if (deleted && userId) {
            await TaskService.logChange(taskId, userId, 'delete', 'task', deleted.title, null);
        }
        return deleted;
    }

    // Approve task (PM/Owner only) — marks task completed
    static async approveTask(taskId: number, userId?: number) {
        const [current] = await db.select().from(tasks).where(eq(tasks.id, taskId));
        const previousStatus = current?.status || 'review';

        const [task] = await db.update(tasks)
            .set({
                status: 'done',
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId))
            .returning();

        await TaskService.logChange(taskId, userId || null, 'status_change', 'status', previousStatus, 'done');
        return task;
    }

    // Reject task (PM/Owner only) — send back to assignee for rework
    static async rejectTask(taskId: number, userId?: number, reason?: string) {
        const [current] = await db.select().from(tasks).where(eq(tasks.id, taskId));
        const previousStatus = current?.status || 'review';

        const [task] = await db.update(tasks)
            .set({
                status: 'in-progress',
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId))
            .returning();

        if (reason && userId) {
            await db.insert(comments).values({
                taskId,
                userId,
                content: `Review feedback: ${reason}`,
                createdAt: new Date(),
            });
        }

        await TaskService.logChange(taskId, userId || null, 'status_change', 'status', previousStatus, 'in-progress');
        return task;
    }

    // LOCK & UNLOCK
    static async lockTask(taskId: number, userId: number) {
        const [task] = await db.update(tasks)
            .set({
                isLocked: true,
                lockedById: userId,
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId))
            .returning();

        await TaskService.logChange(taskId, userId, 'update', 'isLocked', 'false', 'true');
        return task;
    }

    static async unlockTask(taskId: number, userId: number) {
        const [task] = await db.update(tasks)
            .set({
                isLocked: false,
                lockedById: null,
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId))
            .returning();

        await TaskService.logChange(taskId, userId, 'update', 'isLocked', 'true', 'false');
        return task;
    }

    // WATCHERS
    static async watchTask(taskId: number, userId: number, role: 'watcher' | 'follower' = 'watcher') {
        const [existing] = await db.select().from(taskWatchers)
            .where(and(eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, userId)));
        if (existing) return existing;

        const [watcher] = await db.insert(taskWatchers).values({
            taskId,
            userId,
            role,
            createdAt: new Date()
        }).returning();

        await TaskService.logChange(taskId, userId, 'update', 'watcher', null, role);
        return watcher;
    }

    static async unwatchTask(taskId: number, userId: number) {
        const [deleted] = await db.delete(taskWatchers)
            .where(and(eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, userId)))
            .returning();

        if (deleted) {
            await TaskService.logChange(taskId, userId, 'update', 'watcher', deleted.role, null);
        }
        return deleted;
    }

    // UNDO & REDO
    static async undoChange(taskId: number, userId: number) {
        const [lastHistory] = await db.select()
            .from(taskHistory)
            .where(and(eq(taskHistory.taskId, taskId), eq(taskHistory.isUndone, false)))
            .orderBy(desc(taskHistory.createdAt))
            .limit(1);

        if (!lastHistory) throw new Error("No changes to undo");

        const field = lastHistory.fieldName;
        const oldVal = lastHistory.oldValue;

        // Apply old value back to task
        let updatePayload: any = {};
        if (field === 'estimatedHours') {
            updatePayload[field] = oldVal ? parseFloat(oldVal) : null;
        } else if (field === 'isLocked' || field === 'isRecurring' || field === 'isTimerActive' || field === 'isArchived') {
            updatePayload[field] = oldVal === 'true';
        } else if (field === 'assigneeId' || field === 'projectId' || field === 'lockedById') {
            updatePayload[field] = oldVal ? parseInt(oldVal, 10) : null;
        } else {
            updatePayload[field] = oldVal;
        }

        const [updatedTask] = await db.update(tasks)
            .set({ ...updatePayload, updatedAt: new Date() })
            .where(eq(tasks.id, taskId))
            .returning();

        // Mark history as undone
        await db.update(taskHistory)
            .set({ isUndone: true })
            .where(eq(taskHistory.id, lastHistory.id));

        return updatedTask;
    }

    static async redoChange(taskId: number, userId: number) {
        const [lastUndone] = await db.select()
            .from(taskHistory)
            .where(and(eq(taskHistory.taskId, taskId), eq(taskHistory.isUndone, true)))
            .orderBy(desc(taskHistory.createdAt))
            .limit(1);

        if (!lastUndone) throw new Error("No changes to redo");

        const field = lastUndone.fieldName;
        const newVal = lastUndone.newValue;

        // Apply new value back to task
        let updatePayload: any = {};
        if (field === 'estimatedHours') {
            updatePayload[field] = newVal ? parseFloat(newVal) : null;
        } else if (field === 'isLocked' || field === 'isRecurring' || field === 'isTimerActive' || field === 'isArchived') {
            updatePayload[field] = newVal === 'true';
        } else if (field === 'assigneeId' || field === 'projectId' || field === 'lockedById') {
            updatePayload[field] = newVal ? parseInt(newVal, 10) : null;
        } else {
            updatePayload[field] = newVal;
        }

        const [updatedTask] = await db.update(tasks)
            .set({ ...updatePayload, updatedAt: new Date() })
            .where(eq(tasks.id, taskId))
            .returning();

        // Mark history as active (not undone)
        await db.update(taskHistory)
            .set({ isUndone: false })
            .where(eq(taskHistory.id, lastUndone.id));

        return updatedTask;
    }

    // ARCHIVE & RESTORE
    static async archiveTask(taskId: number, userId: number) {
        const [task] = await db.update(tasks)
            .set({ isArchived: true, updatedAt: new Date() })
            .where(eq(tasks.id, taskId))
            .returning();

        await TaskService.logChange(taskId, userId, 'update', 'isArchived', 'false', 'true');
        return task;
    }

    static async restoreTask(taskId: number, userId: number) {
        const [task] = await db.update(tasks)
            .set({ isArchived: false, updatedAt: new Date() })
            .where(eq(tasks.id, taskId))
            .returning();

        await TaskService.logChange(taskId, userId, 'update', 'isArchived', 'true', 'false');
        return task;
    }

    // DUPLICATE & CLONE
    static async duplicateTask(taskId: number, userId: number) {
        const details = await TaskService.getTaskDetails(taskId);
        if (!details) throw new Error("Task not found");

        const [dup] = await db.insert(tasks).values({
            projectId: details.projectId,
            title: `Copy of ${details.title}`,
            description: details.description,
            status: details.status,
            priority: details.priority,
            workType: details.workType,
            assigneeId: details.assigneeId,
            isMilestone: details.isMilestone,
            dueDate: details.dueDate,
            estimatedHours: details.estimatedHours,
            labels: details.labels,
            category: details.category,
            isRecurring: details.isRecurring,
            recurrenceCron: details.recurrenceCron,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        // Copy checklist subtasks
        if (details.subtasks && details.subtasks.length > 0) {
            for (const s of details.subtasks) {
                await db.insert(subtasks).values({
                    taskId: dup.id,
                    title: s.title,
                    isCompleted: s.isCompleted,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }

        await TaskService.logChange(dup.id, userId, 'create', 'task', null, dup.title);
        return dup;
    }

    // TIMERS & POMODORO
    static async startTimer(taskId: number, userId: number) {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
        if (!task) throw new Error("Task not found");

        const [project] = await db.select().from(projects).where(eq(projects.id, task.projectId)).limit(1);
        if (!project) throw new Error("Project not found");

        const activeWorkspaceId = project.workspaceId;
        if (activeWorkspaceId === null) throw new Error("Project has no active workspace");

        // Check if there is already an active timer running for this user in this workspace
        const [active] = await db.select().from(timeLogs).where(
            and(
                eq(timeLogs.workspaceId, activeWorkspaceId),
                eq(timeLogs.userId, userId),
                isNull(timeLogs.endTime)
            )
        ).limit(1);

        if (active) {
            throw new Error("A timer is already running. Please stop it first.");
        }

        const now = new Date();
        const [newLog] = await db.insert(timeLogs).values({
            workspaceId: activeWorkspaceId,
            userId: userId,
            taskId: taskId,
            description: `Working on task: ${task.title}`,
            startTime: now,
            status: 'running',
            createdAt: now
        }).returning();

        const [updatedTask] = await db.update(tasks)
            .set({
                isTimerActive: true,
                timerStartedAt: now,
                updatedAt: now
            })
            .where(eq(tasks.id, taskId))
            .returning();

        await TaskService.logChange(taskId, userId, 'timer', 'isTimerActive', 'false', 'true');
        return updatedTask;
    }

    static async stopTimer(taskId: number, userId: number) {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
        if (!task) throw new Error("Task not found");

        const [project] = await db.select().from(projects).where(eq(projects.id, task.projectId)).limit(1);
        if (!project) throw new Error("Project not found");

        const activeWorkspaceId = project.workspaceId;
        if (activeWorkspaceId === null) throw new Error("Project has no active workspace");

        // Find the active time log for this task and user
        const [active] = await db.select().from(timeLogs).where(
            and(
                eq(timeLogs.workspaceId, activeWorkspaceId),
                eq(timeLogs.userId, userId),
                eq(timeLogs.taskId, taskId),
                isNull(timeLogs.endTime)
            )
        ).limit(1);

        if (!active) {
            throw new Error("Timer is not active");
        }

        const endTime = new Date();
        let totalPausedSeconds = active.totalPausedSeconds;
        if (active.status === 'paused' && active.pausedAt) {
            totalPausedSeconds += Math.round((endTime.getTime() - active.pausedAt.getTime()) / 1000);
        }
        const duration = Math.round((endTime.getTime() - active.startTime.getTime()) / 1000) - totalPausedSeconds;

        const [updatedLog] = await db.update(timeLogs)
            .set({
                endTime,
                duration: duration > 0 ? duration : 0,
                status: 'stopped',
                pausedAt: null,
                totalPausedSeconds
            })
            .where(eq(timeLogs.id, active.id))
            .returning();

        const addedHours = (updatedLog.duration || 0) / 3600;
        const newActual = Number(task.actualHours || 0) + addedHours;

        const [updatedTask] = await db.update(tasks)
            .set({
                isTimerActive: false,
                timerStartedAt: null,
                actualHours: parseFloat(newActual.toFixed(2)),
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId))
            .returning();

        await TaskService.logChange(taskId, userId, 'timer', 'isTimerActive', 'true', 'false');
        await TaskService.logChange(taskId, userId, 'timer', 'actualHours', String(task.actualHours), String(updatedTask.actualHours));
        return updatedTask;
    }

    static async startPomodoro(taskId: number, userId: number) {
        const [task] = await db.update(tasks)
            .set({
                activePomodoroSession: true,
                pomodoroTimerStartedAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId))
            .returning();

        await TaskService.logChange(taskId, userId, 'pomodoro', 'activePomodoroSession', 'false', 'true');
        return task;
    }

    static async stopPomodoro(taskId: number, userId: number) {
        const [current] = await db.select().from(tasks).where(eq(tasks.id, taskId));
        if (!current) throw new Error("Task not found");

        const newCount = current.pomodoroCount + 1;

        const [task] = await db.update(tasks)
            .set({
                activePomodoroSession: false,
                pomodoroCount: newCount,
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId))
            .returning();

        await TaskService.logChange(taskId, userId, 'pomodoro', 'activePomodoroSession', 'true', 'false');
        await TaskService.logChange(taskId, userId, 'pomodoro', 'pomodoroCount', String(current.pomodoroCount), String(newCount));
        return task;
    }

    // BULK OPERATIONS — run concurrently for performance
    static async bulkUpdate(taskIds: number[], updates: Partial<NewTask>, userId: number) {
        return Promise.all(taskIds.map(id => TaskService.updateTask(id, updates, userId)));
    }

    static async bulkDelete(taskIds: number[], userId: number) {
        return Promise.all(taskIds.map(id => TaskService.deleteTask(id, userId)));
    }

    // TEMPLATES
    static async createTemplate(workspaceId: number, taskData: Partial<NewTask>) {
        const [tpl] = await db.insert(taskTemplates).values({
            workspaceId,
            title: taskData.title || 'Template Title',
            description: taskData.description || null,
            priority: taskData.priority || 'medium',
            workType: taskData.workType || 'task',
            estimatedHours: taskData.estimatedHours || null,
            labels: taskData.labels || null,
            category: taskData.category || null,
            createdAt: new Date()
        }).returning();

        return tpl;
    }

    static async getTemplates(workspaceId: number) {
        return db.select().from(taskTemplates).where(eq(taskTemplates.workspaceId, workspaceId));
    }

    static async applyTemplate(templateId: number, projectId: number, userId: number) {
        const [tpl] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, templateId));
        if (!tpl) throw new Error("Template not found");

        const task = await TaskService.createTask({
            projectId,
            title: tpl.title,
            description: tpl.description,
            priority: tpl.priority || 'medium',
            workType: tpl.workType || 'task',
            estimatedHours: tpl.estimatedHours,
            labels: tpl.labels,
            category: tpl.category,
            status: 'todo',
            createdAt: new Date(),
            updatedAt: new Date()
        }, userId);

        return task;
    }

    // SUBTASKS OPERATIONS
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

    // COMMENTS OPERATIONS
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

    // ATTACHMENTS OPERATIONS
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
