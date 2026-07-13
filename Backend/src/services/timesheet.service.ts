import { db } from '../db';
import { timesheets, timeLogs, workLogs, users, tasks, projects, workspaceMembers } from '../db/schema';
import { eq, and, gte, lte, desc, inArray, sql } from 'drizzle-orm';
import { NotificationService } from './notification.service';
import { socketService } from './socket.service';
import { env } from '../config/env';

export const MANAGER_ROLES = ['owner', 'admin', 'manager', 'super_admin'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// All date math here is pinned to UTC (rather than server-local time) so that period
// boundaries line up consistently with timeLogs.startTime, which is stored as a UTC
// timestamp — using local-time Date methods would shift day/week/month boundaries by
// the server's UTC offset and mis-bucket entries near midnight.
function toDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Compute the canonical [periodStart, periodEnd] window (inclusive, YYYY-MM-DD) for a given
// periodType and an arbitrary anchor date within that period.
export function resolvePeriod(periodType: string, anchor: string): { periodStart: string; periodEnd: string } {
  const anchorDate = new Date(anchor + 'T00:00:00Z');
  if (Number.isNaN(anchorDate.getTime())) throw new Error('Invalid period date');

  if (periodType === 'daily') {
    const s = toDateString(anchorDate);
    return { periodStart: s, periodEnd: s };
  }

  if (periodType === 'weekly') {
    const start = new Date(anchorDate);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // snap back to Sunday
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6); // Saturday
    return { periodStart: toDateString(start), periodEnd: toDateString(end) };
  }

  if (periodType === 'monthly') {
    const start = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() + 1, 0));
    return { periodStart: toDateString(start), periodEnd: toDateString(end) };
  }

  throw new Error('Invalid period type');
}

async function computePeriodAggregates(workspaceId: number, userId: number, periodStart: string, periodEnd: string) {
  const rangeStart = new Date(periodStart + 'T00:00:00Z');
  const rangeEnd = new Date(periodEnd + 'T23:59:59.999Z');

  const [timeRow] = await db.select({
    totalSeconds: sql<number>`coalesce(sum(
      case when ${timeLogs.endTime} is not null then ${timeLogs.duration}
      else greatest(0, extract(epoch from (now() - ${timeLogs.startTime}))::int - ${timeLogs.totalPausedSeconds})
      end
    ), 0)::int`,
  })
    .from(timeLogs)
    .where(and(
      eq(timeLogs.workspaceId, workspaceId),
      eq(timeLogs.userId, userId),
      gte(timeLogs.startTime, rangeStart),
      lte(timeLogs.startTime, rangeEnd),
    ));

  const [logRow] = await db.select({
    count: sql<number>`count(*)::int`,
  })
    .from(workLogs)
    .where(and(
      eq(workLogs.workspaceId, workspaceId),
      eq(workLogs.userId, userId),
      gte(workLogs.logDate, periodStart),
      lte(workLogs.logDate, periodEnd),
    ));

  const totalHours = (timeRow?.totalSeconds || 0) / 3600;
  return {
    totalHours,
    billableHours: totalHours, // no non-billable classification exists yet in the system
    workLogCount: logRow?.count || 0,
  };
}

export class TimesheetService {
  static async generate(workspaceId: number, userId: number, periodType: string, anchorDate: string) {
    const { periodStart, periodEnd } = resolvePeriod(periodType, anchorDate);

    const [existing] = await db.select().from(timesheets).where(and(
      eq(timesheets.workspaceId, workspaceId),
      eq(timesheets.userId, userId),
      eq(timesheets.periodType, periodType),
      eq(timesheets.periodStart, periodStart),
    )).limit(1);

    if (existing?.isLocked) {
      throw new Error('This timesheet period is already locked and cannot be regenerated');
    }

    const aggregates = await computePeriodAggregates(workspaceId, userId, periodStart, periodEnd);

    if (existing) {
      const [updated] = await db.update(timesheets).set({
        ...aggregates,
        updatedAt: new Date(),
      }).where(eq(timesheets.id, existing.id)).returning();
      return updated;
    }

    const [created] = await db.insert(timesheets).values({
      workspaceId,
      userId,
      periodType,
      periodStart,
      periodEnd,
      ...aggregates,
      status: 'draft',
    }).returning();
    return created;
  }

  static async listMine(workspaceId: number, userId: number, filters: { periodType?: string; status?: string } = {}) {
    const conditions = [eq(timesheets.workspaceId, workspaceId), eq(timesheets.userId, userId)];
    if (filters.periodType) conditions.push(eq(timesheets.periodType, filters.periodType));
    if (filters.status) conditions.push(eq(timesheets.status, filters.status));

    return db.select().from(timesheets).where(and(...conditions)).orderBy(desc(timesheets.periodStart));
  }

  static async listTeam(workspaceId: number, filters: { periodType?: string; status?: string; userId?: number } = {}) {
    const conditions = [eq(timesheets.workspaceId, workspaceId)];
    if (filters.periodType) conditions.push(eq(timesheets.periodType, filters.periodType));
    if (filters.status) conditions.push(eq(timesheets.status, filters.status));
    if (filters.userId) conditions.push(eq(timesheets.userId, filters.userId));

    return db.select({
      id: timesheets.id,
      userId: timesheets.userId,
      employeeName: users.name,
      employeeEmail: users.email,
      periodType: timesheets.periodType,
      periodStart: timesheets.periodStart,
      periodEnd: timesheets.periodEnd,
      totalHours: timesheets.totalHours,
      billableHours: timesheets.billableHours,
      workLogCount: timesheets.workLogCount,
      status: timesheets.status,
      isLocked: timesheets.isLocked,
      submittedAt: timesheets.submittedAt,
      reviewNote: timesheets.reviewNote,
      reviewedAt: timesheets.reviewedAt,
      createdAt: timesheets.createdAt,
    })
      .from(timesheets)
      .innerJoin(users, eq(timesheets.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(timesheets.periodStart));
  }

  static async getById(id: number, workspaceId: number) {
    const [row] = await db.select().from(timesheets).where(
      and(eq(timesheets.id, id), eq(timesheets.workspaceId, workspaceId))
    ).limit(1);
    return row || null;
  }

  // Detailed breakdown used for on-screen view + PDF/Excel export: daily rows within the period
  static async getBreakdown(timesheet: typeof timesheets.$inferSelect) {
    const rangeStart = new Date(timesheet.periodStart + 'T00:00:00Z');
    const rangeEnd = new Date(timesheet.periodEnd + 'T23:59:59.999Z');

    const timeRows = await db.select({
      id: timeLogs.id,
      taskId: timeLogs.taskId,
      taskTitle: tasks.title,
      description: timeLogs.description,
      startTime: timeLogs.startTime,
      endTime: timeLogs.endTime,
      duration: timeLogs.duration,
      status: timeLogs.status,
    })
      .from(timeLogs)
      .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
      .where(and(
        eq(timeLogs.workspaceId, timesheet.workspaceId),
        eq(timeLogs.userId, timesheet.userId),
        gte(timeLogs.startTime, rangeStart),
        lte(timeLogs.startTime, rangeEnd),
      ))
      .orderBy(timeLogs.startTime);

    const logRows = await db.select({
      id: workLogs.id,
      title: workLogs.title,
      logDate: workLogs.logDate,
      hoursWorked: workLogs.hoursWorked,
      progressPercent: workLogs.progressPercent,
      status: workLogs.status,
      projectId: workLogs.projectId,
      projectName: projects.name,
    })
      .from(workLogs)
      .leftJoin(projects, eq(workLogs.projectId, projects.id))
      .where(and(
        eq(workLogs.workspaceId, timesheet.workspaceId),
        eq(workLogs.userId, timesheet.userId),
        gte(workLogs.logDate, timesheet.periodStart),
        lte(workLogs.logDate, timesheet.periodEnd),
      ))
      .orderBy(workLogs.logDate);

    return { timeEntries: timeRows, workLogEntries: logRows };
  }

  static async submit(id: number, workspaceId: number, userId: number) {
    const [existing] = await db.select().from(timesheets).where(
      and(eq(timesheets.id, id), eq(timesheets.workspaceId, workspaceId), eq(timesheets.userId, userId))
    ).limit(1);
    if (!existing) throw new Error('Timesheet not found');
    if (existing.isLocked) throw new Error('This timesheet is locked and cannot be resubmitted');
    if (existing.status === 'submitted') throw new Error('Timesheet is already awaiting review');

    const [updated] = await db.update(timesheets).set({
      status: 'submitted',
      submittedAt: new Date(),
      reviewedByUserId: null,
      reviewNote: null,
      reviewedAt: null,
      updatedAt: new Date(),
    }).where(eq(timesheets.id, id)).returning();

    await this.notifyReviewers(workspaceId, userId, updated);
    socketService.broadcastToWorkspace(workspaceId, 'timesheet.submitted', updated);
    return updated;
  }

  static async approve(id: number, workspaceId: number, reviewerId: number, note?: string | null) {
    const [existing] = await db.select().from(timesheets).where(
      and(eq(timesheets.id, id), eq(timesheets.workspaceId, workspaceId))
    ).limit(1);
    if (!existing) throw new Error('Timesheet not found');
    if (existing.status !== 'submitted') throw new Error('Only submitted timesheets can be approved');

    const [updated] = await db.update(timesheets).set({
      status: 'approved',
      isLocked: true,
      reviewedByUserId: reviewerId,
      reviewNote: note || null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(timesheets.id, id)).returning();

    await this.notifyOwner(workspaceId, reviewerId, updated, true);
    socketService.broadcastToWorkspace(workspaceId, 'timesheet.reviewed', updated);
    return updated;
  }

  static async reject(id: number, workspaceId: number, reviewerId: number, note: string | null) {
    const [existing] = await db.select().from(timesheets).where(
      and(eq(timesheets.id, id), eq(timesheets.workspaceId, workspaceId))
    ).limit(1);
    if (!existing) throw new Error('Timesheet not found');
    if (existing.status !== 'submitted') throw new Error('Only submitted timesheets can be rejected');

    const [updated] = await db.update(timesheets).set({
      status: 'rejected',
      isLocked: false,
      reviewedByUserId: reviewerId,
      reviewNote: note || null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(timesheets.id, id)).returning();

    await this.notifyOwner(workspaceId, reviewerId, updated, false);
    socketService.broadcastToWorkspace(workspaceId, 'timesheet.reviewed', updated);
    return updated;
  }

  static async setLock(id: number, workspaceId: number, isLocked: boolean) {
    const [existing] = await db.select().from(timesheets).where(
      and(eq(timesheets.id, id), eq(timesheets.workspaceId, workspaceId))
    ).limit(1);
    if (!existing) throw new Error('Timesheet not found');

    const [updated] = await db.update(timesheets).set({ isLocked, updatedAt: new Date() }).where(eq(timesheets.id, id)).returning();
    socketService.broadcastToWorkspace(workspaceId, 'timesheet.reviewed', updated);
    return updated;
  }

  private static async notifyReviewers(workspaceId: number, submitterId: number, sheet: typeof timesheets.$inferSelect) {
    const [submitter] = await db.select().from(users).where(eq(users.id, submitterId)).limit(1);

    const reviewers = await db.select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.status, 'active'), inArray(workspaceMembers.role, MANAGER_ROLES)));

    for (const reviewer of reviewers) {
      if (reviewer.userId === submitterId) continue;
      await NotificationService.dispatch({
        event: 'timesheet.submitted',
        userId: reviewer.userId,
        workspaceId,
        entityType: 'timesheet',
        entityId: sheet.id,
        title: 'Timesheet Submitted for Review',
        message: `${submitter?.name || 'An employee'} submitted a ${sheet.periodType} timesheet (${sheet.periodStart} - ${sheet.periodEnd}).`,
        link: '/timesheet/review',
        emailTemplate: 'timesheetSubmitted',
        emailData: {
          employeeName: submitter?.name || 'Employee',
          periodType: sheet.periodType,
          periodStart: sheet.periodStart,
          periodEnd: sheet.periodEnd,
          totalHours: sheet.totalHours,
          link: `${env.FRONTEND_URL}/timesheet/review`,
        },
      });
    }
  }

  private static async notifyOwner(workspaceId: number, reviewerId: number, sheet: typeof timesheets.$inferSelect, isApproved: boolean) {
    const [reviewer] = await db.select().from(users).where(eq(users.id, reviewerId)).limit(1);

    if (isApproved) {
      await NotificationService.dispatch({
        event: 'timesheet.approved',
        userId: sheet.userId,
        workspaceId,
        entityType: 'timesheet',
        entityId: sheet.id,
        title: 'Timesheet Approved',
        message: `Your ${sheet.periodType} timesheet (${sheet.periodStart} - ${sheet.periodEnd}) was approved and locked by ${reviewer?.name || 'a manager'}.`,
        link: '/timesheet',
        emailTemplate: 'timesheetApproved',
        emailData: {
          periodType: sheet.periodType,
          periodStart: sheet.periodStart,
          periodEnd: sheet.periodEnd,
          approvedBy: reviewer?.name || 'Manager',
          link: `${env.FRONTEND_URL}/timesheet`,
        },
      });
    } else {
      await NotificationService.dispatch({
        event: 'timesheet.rejected',
        userId: sheet.userId,
        workspaceId,
        entityType: 'timesheet',
        entityId: sheet.id,
        title: 'Timesheet Rejected',
        message: `Your ${sheet.periodType} timesheet (${sheet.periodStart} - ${sheet.periodEnd}) was rejected by ${reviewer?.name || 'a manager'}.`,
        link: '/timesheet',
        emailTemplate: 'timesheetRejected',
        emailData: {
          periodType: sheet.periodType,
          periodStart: sheet.periodStart,
          periodEnd: sheet.periodEnd,
          reviewedBy: reviewer?.name || 'Manager',
          reason: sheet.reviewNote,
          link: `${env.FRONTEND_URL}/timesheet`,
        },
      });
    }
  }
}
