import { db } from '../db';
import { workLogs, workLogAttachments, users, projects, tasks, workspaceMembers } from '../db/schema';
import { eq, and, desc, gte, lte, inArray } from 'drizzle-orm';
import { NotificationService } from './notification.service';
import { socketService } from './socket.service';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export const MANAGER_ROLES = ['owner', 'admin', 'manager', 'super_admin'];

export interface WorkLogInput {
  title: string;
  taskId?: number | string | null;
  projectId?: number | string | null;
  logDate: string;
  startTime?: string | null;
  endTime?: string | null;
  hoursWorked: number;
  progressPercent?: number;
  description: string;
  challenges?: string | null;
  tomorrowPlan?: string | null;
  gitCommitUrl?: string | null;
  attachments?: Array<{ fileName: string; fileUrl: string; fileSize?: number | null; fileType?: string | null }>;
}

function toIntOrNull(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

export class WorkLogService {
  static async submitWorkLog(workspaceId: number, userId: number, input: WorkLogInput) {
    const [log] = await db.insert(workLogs).values({
      workspaceId,
      userId,
      title: input.title,
      taskId: toIntOrNull(input.taskId),
      projectId: toIntOrNull(input.projectId),
      logDate: input.logDate,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      hoursWorked: input.hoursWorked,
      progressPercent: input.progressPercent ?? 0,
      description: input.description,
      challenges: input.challenges || null,
      tomorrowPlan: input.tomorrowPlan || null,
      gitCommitUrl: input.gitCommitUrl || null,
      status: 'pending',
    }).returning();

    if (input.attachments && input.attachments.length > 0) {
      await db.insert(workLogAttachments).values(
        input.attachments.map(a => ({
          workLogId: log.id,
          userId,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize ?? null,
          fileType: a.fileType ?? null,
        }))
      );
    }

    await this.notifyReviewers(workspaceId, userId, log);
    socketService.broadcastToWorkspace(workspaceId, 'workLog.submitted', log);

    return this.getWorkLogWithAttachments(log.id, workspaceId);
  }

  static async updateWorkLog(workLogId: number, workspaceId: number, userId: number, input: WorkLogInput) {
    const [existing] = await db.select().from(workLogs).where(
      and(eq(workLogs.id, workLogId), eq(workLogs.workspaceId, workspaceId), eq(workLogs.userId, userId))
    ).limit(1);
    if (!existing) throw new Error('Work log not found');
    if (existing.status === 'approved') throw new Error('Approved work logs cannot be edited');

    const [updated] = await db.update(workLogs).set({
      title: input.title,
      taskId: toIntOrNull(input.taskId),
      projectId: toIntOrNull(input.projectId),
      logDate: input.logDate,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      hoursWorked: input.hoursWorked,
      progressPercent: input.progressPercent ?? existing.progressPercent,
      description: input.description,
      challenges: input.challenges || null,
      tomorrowPlan: input.tomorrowPlan || null,
      gitCommitUrl: input.gitCommitUrl || null,
      status: 'pending',
      reviewedByUserId: null,
      reviewNote: null,
      reviewedAt: null,
      updatedAt: new Date(),
    }).where(eq(workLogs.id, workLogId)).returning();

    socketService.broadcastToWorkspace(workspaceId, 'workLog.updated', updated);
    return this.getWorkLogWithAttachments(updated.id, workspaceId);
  }

  static async listMine(workspaceId: number, userId: number, filters: { from?: string; to?: string; status?: string } = {}) {
    const conditions = [eq(workLogs.workspaceId, workspaceId), eq(workLogs.userId, userId)];
    if (filters.from) conditions.push(gte(workLogs.logDate, filters.from));
    if (filters.to) conditions.push(lte(workLogs.logDate, filters.to));
    if (filters.status) conditions.push(eq(workLogs.status, filters.status));

    return db.select({
      id: workLogs.id,
      title: workLogs.title,
      taskId: workLogs.taskId,
      taskTitle: tasks.title,
      projectId: workLogs.projectId,
      projectName: projects.name,
      logDate: workLogs.logDate,
      startTime: workLogs.startTime,
      endTime: workLogs.endTime,
      hoursWorked: workLogs.hoursWorked,
      progressPercent: workLogs.progressPercent,
      description: workLogs.description,
      challenges: workLogs.challenges,
      tomorrowPlan: workLogs.tomorrowPlan,
      gitCommitUrl: workLogs.gitCommitUrl,
      status: workLogs.status,
      reviewNote: workLogs.reviewNote,
      reviewedAt: workLogs.reviewedAt,
      createdAt: workLogs.createdAt,
    })
      .from(workLogs)
      .leftJoin(tasks, eq(workLogs.taskId, tasks.id))
      .leftJoin(projects, eq(workLogs.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(workLogs.logDate), desc(workLogs.createdAt));
  }

  static async listTeam(workspaceId: number, filters: { from?: string; to?: string; status?: string; userId?: number } = {}) {
    const conditions = [eq(workLogs.workspaceId, workspaceId)];
    if (filters.from) conditions.push(gte(workLogs.logDate, filters.from));
    if (filters.to) conditions.push(lte(workLogs.logDate, filters.to));
    if (filters.status) conditions.push(eq(workLogs.status, filters.status));
    if (filters.userId) conditions.push(eq(workLogs.userId, filters.userId));

    return db.select({
      id: workLogs.id,
      title: workLogs.title,
      userId: workLogs.userId,
      employeeName: users.name,
      employeeEmail: users.email,
      taskId: workLogs.taskId,
      taskTitle: tasks.title,
      projectId: workLogs.projectId,
      projectName: projects.name,
      logDate: workLogs.logDate,
      startTime: workLogs.startTime,
      endTime: workLogs.endTime,
      hoursWorked: workLogs.hoursWorked,
      progressPercent: workLogs.progressPercent,
      description: workLogs.description,
      challenges: workLogs.challenges,
      tomorrowPlan: workLogs.tomorrowPlan,
      gitCommitUrl: workLogs.gitCommitUrl,
      status: workLogs.status,
      reviewNote: workLogs.reviewNote,
      reviewedAt: workLogs.reviewedAt,
      createdAt: workLogs.createdAt,
    })
      .from(workLogs)
      .innerJoin(users, eq(workLogs.userId, users.id))
      .leftJoin(tasks, eq(workLogs.taskId, tasks.id))
      .leftJoin(projects, eq(workLogs.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(workLogs.logDate), desc(workLogs.createdAt));
  }

  static async getWorkLogWithAttachments(workLogId: number, workspaceId: number) {
    const [log] = await db.select().from(workLogs).where(
      and(eq(workLogs.id, workLogId), eq(workLogs.workspaceId, workspaceId))
    ).limit(1);
    if (!log) return null;
    const attachments = await db.select().from(workLogAttachments).where(eq(workLogAttachments.workLogId, workLogId));
    return { ...log, attachments };
  }

  static async approve(workLogId: number, workspaceId: number, reviewerId: number, note?: string | null) {
    const [log] = await db.select().from(workLogs).where(
      and(eq(workLogs.id, workLogId), eq(workLogs.workspaceId, workspaceId))
    ).limit(1);
    if (!log) throw new Error('Work log not found');

    const [updated] = await db.update(workLogs).set({
      status: 'approved',
      reviewedByUserId: reviewerId,
      reviewNote: note || null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(workLogs.id, workLogId)).returning();

    await this.notifyOwner(workspaceId, reviewerId, updated, true);
    socketService.broadcastToWorkspace(workspaceId, 'workLog.reviewed', updated);
    return updated;
  }

  static async reject(workLogId: number, workspaceId: number, reviewerId: number, note: string | null, isChangesRequested: boolean) {
    const [log] = await db.select().from(workLogs).where(
      and(eq(workLogs.id, workLogId), eq(workLogs.workspaceId, workspaceId))
    ).limit(1);
    if (!log) throw new Error('Work log not found');

    const [updated] = await db.update(workLogs).set({
      status: isChangesRequested ? 'changes_requested' : 'rejected',
      reviewedByUserId: reviewerId,
      reviewNote: note || null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(workLogs.id, workLogId)).returning();

    await this.notifyOwner(workspaceId, reviewerId, updated, false, isChangesRequested);
    socketService.broadcastToWorkspace(workspaceId, 'workLog.reviewed', updated);
    return updated;
  }

  static async bulkApprove(workLogIds: number[], workspaceId: number, reviewerId: number) {
    const succeeded = [];
    const failed: { id: number; error: string }[] = [];
    for (const id of workLogIds) {
      try {
        succeeded.push(await this.approve(id, workspaceId, reviewerId, 'Bulk approved'));
      } catch (err) {
        logger.error(`bulkApprove failed for workLog ${id}: ${err}`);
        failed.push({ id, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return { succeeded, failed };
  }

  // Notify workspace managers (owner/admin/manager) that a log is awaiting review
  private static async notifyReviewers(workspaceId: number, submitterId: number, log: typeof workLogs.$inferSelect) {
    const [submitter] = await db.select().from(users).where(eq(users.id, submitterId)).limit(1);

    const reviewers = await db.select({
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.status, 'active'), inArray(workspaceMembers.role, MANAGER_ROLES)));

    for (const reviewer of reviewers) {
      if (reviewer.userId === submitterId) continue;
      await NotificationService.dispatch({
        event: 'workLog.submitted',
        userId: reviewer.userId,
        workspaceId,
        entityType: 'workLog',
        entityId: log.id,
        title: 'Work Log Submitted for Review',
        message: `${submitter?.name || 'An employee'} submitted a daily work log: "${log.title}".`,
        link: '/work-log/review',
        emailTemplate: 'workLogSubmitted',
        emailData: {
          employeeName: submitter?.name || 'Employee',
          logTitle: log.title,
          logDate: log.logDate,
          hoursWorked: log.hoursWorked,
          link: `${env.FRONTEND_URL}/work-log/review`,
        },
      });
    }
  }

  private static async notifyOwner(workspaceId: number, reviewerId: number, log: typeof workLogs.$inferSelect, isApproved: boolean, isChangesRequested = false) {
    const [reviewer] = await db.select().from(users).where(eq(users.id, reviewerId)).limit(1);

    if (isApproved) {
      await NotificationService.dispatch({
        event: 'workLog.approved',
        userId: log.userId,
        workspaceId,
        entityType: 'workLog',
        entityId: log.id,
        title: 'Work Log Approved',
        message: `Your work log "${log.title}" was approved by ${reviewer?.name || 'a manager'}.`,
        link: '/work-log',
        emailTemplate: 'workLogApproved',
        emailData: {
          logTitle: log.title,
          logDate: log.logDate,
          approvedBy: reviewer?.name || 'Manager',
          link: `${env.FRONTEND_URL}/work-log`,
        },
      });
    } else {
      await NotificationService.dispatch({
        event: 'workLog.rejected',
        userId: log.userId,
        workspaceId,
        entityType: 'workLog',
        entityId: log.id,
        title: isChangesRequested ? 'Work Log Needs Changes' : 'Work Log Rejected',
        message: `Your work log "${log.title}" ${isChangesRequested ? 'requires changes' : 'was rejected'} by ${reviewer?.name || 'a manager'}.`,
        link: '/work-log',
        emailTemplate: 'workLogRejected',
        emailData: {
          logTitle: log.title,
          logDate: log.logDate,
          reviewedBy: reviewer?.name || 'Manager',
          reason: log.reviewNote,
          isChangesRequested,
          link: `${env.FRONTEND_URL}/work-log`,
        },
      });
    }
  }
}
