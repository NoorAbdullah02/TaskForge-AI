import { db } from '../db/index';
import { eq, and, desc, gte, count, like, inArray, or } from 'drizzle-orm';
import { projects, tasks, attendance, leaveRequests, activityLogs, users, workspaceMembers } from '../db/schema';
import { mergeStatusCounts } from '../lib/taskStatus';

export class DashboardService {
    static async getStats(userId: number, workspaceId?: number | null) {
        const now = new Date();
        const eightWeeksAgo = new Date(now);
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Workspace-scoped project IDs
        let workspaceProjectIds: number[] = [];
        let workspaceUserIds: number[] = [];
        if (workspaceId) {
            const wProjects = await db.select({ id: projects.id })
                .from(projects)
                .where(and(eq(projects.workspaceId, workspaceId), eq(projects.isArchived, false)));
            workspaceProjectIds = wProjects.map(p => p.id);

            // All active members in workspace (for leave stats)
            const wMembers = await db.select({ userId: workspaceMembers.userId })
                .from(workspaceMembers)
                .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.status, 'active')));
            workspaceUserIds = wMembers.map(m => m.userId);
        }

        const [
            projectRows,
            taskStatusRows,
            priorityRows,
            currentMonthAttendance,
            leaveStatusRows,
            leaveTypeRows,
            completedTasks,
            recentActivity,
            pendingMembersResult,
            activeMembersResult,
            pendingReviewCountResult,
            reviewQueueRows,
        ] = await Promise.all([
            workspaceId && workspaceProjectIds.length > 0
                ? db.select({ status: projects.status, cnt: count() })
                    .from(projects)
                    .where(and(eq(projects.workspaceId, workspaceId), eq(projects.isArchived, false)))
                    .groupBy(projects.status)
                : db.select({ status: projects.status, cnt: count() })
                    .from(projects)
                    .where(eq(projects.isArchived, false))
                    .groupBy(projects.status),

            workspaceId && workspaceProjectIds.length > 0
                ? db.select({ status: tasks.status, cnt: count() })
                    .from(tasks)
                    .where(inArray(tasks.projectId, workspaceProjectIds))
                    .groupBy(tasks.status)
                : db.select({ status: tasks.status, cnt: count() })
                    .from(tasks)
                    .groupBy(tasks.status),

            workspaceId && workspaceProjectIds.length > 0
                ? db.select({ priority: tasks.priority, cnt: count() })
                    .from(tasks)
                    .where(inArray(tasks.projectId, workspaceProjectIds))
                    .groupBy(tasks.priority)
                : db.select({ priority: tasks.priority, cnt: count() })
                    .from(tasks)
                    .groupBy(tasks.priority),

            db.select()
                .from(attendance)
                .where(and(
                    eq(attendance.userId, userId),
                    like(attendance.date, `${monthStr}%`)
                )),

            db.select({ status: leaveRequests.status, cnt: count() })
                .from(leaveRequests)
                .where(workspaceId && workspaceUserIds.length > 0
                    ? inArray(leaveRequests.userId, workspaceUserIds)
                    : eq(leaveRequests.userId, userId)
                )
                .groupBy(leaveRequests.status),

            db.select({ leaveType: leaveRequests.leaveType, cnt: count() })
                .from(leaveRequests)
                .where(eq(leaveRequests.userId, userId))
                .groupBy(leaveRequests.leaveType),

            workspaceId && workspaceProjectIds.length > 0
                ? db.select({ updatedAt: tasks.updatedAt })
                    .from(tasks)
                    .where(and(
                        or(eq(tasks.status, 'done'), eq(tasks.status, 'approved')),
                        gte(tasks.updatedAt, eightWeeksAgo),
                        inArray(tasks.projectId, workspaceProjectIds)
                    ))
                : db.select({ updatedAt: tasks.updatedAt })
                    .from(tasks)
                    .where(and(
                        or(eq(tasks.status, 'done'), eq(tasks.status, 'approved')),
                        gte(tasks.updatedAt, eightWeeksAgo)
                    )),

            db.select({
                id: activityLogs.id,
                action: activityLogs.action,
                entityType: activityLogs.entityType,
                entityId: activityLogs.entityId,
                details: activityLogs.details,
                createdAt: activityLogs.createdAt,
                userName: users.name,
            })
            .from(activityLogs)
            .leftJoin(users, eq(activityLogs.userId, users.id))
            .where(workspaceId ? eq(activityLogs.workspaceId, workspaceId) : undefined as any)
            .orderBy(desc(activityLogs.createdAt))
            .limit(20),

            // Pending join requests count
            workspaceId
                ? db.select({ cnt: count() })
                    .from(workspaceMembers)
                    .where(and(
                        eq(workspaceMembers.workspaceId, workspaceId),
                        eq(workspaceMembers.status, 'pending')
                    ))
                : Promise.resolve([{ cnt: 0 }]),

            // Active members count
            workspaceId
                ? db.select({ cnt: count() })
                    .from(workspaceMembers)
                    .where(and(
                        eq(workspaceMembers.workspaceId, workspaceId),
                        eq(workspaceMembers.status, 'active')
                    ))
                : Promise.resolve([{ cnt: 0 }]),

            // Pending review count
            workspaceId && workspaceProjectIds.length > 0
                ? db.select({ cnt: count() })
                    .from(tasks)
                    .where(and(
                        inArray(tasks.projectId, workspaceProjectIds),
                        or(eq(tasks.status, 'review'), eq(tasks.status, 'in_review')),
                        eq(tasks.isArchived, false)
                    ))
                : db.select({ cnt: count() })
                    .from(tasks)
                    .where(and(
                        or(eq(tasks.status, 'review'), eq(tasks.status, 'in_review')),
                        eq(tasks.isArchived, false)
                    )),

            // Review queue list
            workspaceId && workspaceProjectIds.length > 0
                ? db.select({
                    id: tasks.id,
                    title: tasks.title,
                    status: tasks.status,
                    priority: tasks.priority,
                    projectId: tasks.projectId,
                    projectName: projects.name,
                    assigneeId: tasks.assigneeId,
                    assigneeName: users.name,
                    updatedAt: tasks.updatedAt,
                })
                    .from(tasks)
                    .innerJoin(projects, eq(tasks.projectId, projects.id))
                    .leftJoin(users, eq(tasks.assigneeId, users.id))
                    .where(and(
                        inArray(tasks.projectId, workspaceProjectIds),
                        or(eq(tasks.status, 'review'), eq(tasks.status, 'in_review')),
                        eq(tasks.isArchived, false)
                    ))
                    .orderBy(desc(tasks.updatedAt))
                    .limit(12)
                : db.select({
                    id: tasks.id,
                    title: tasks.title,
                    status: tasks.status,
                    priority: tasks.priority,
                    projectId: tasks.projectId,
                    projectName: projects.name,
                    assigneeId: tasks.assigneeId,
                    assigneeName: users.name,
                    updatedAt: tasks.updatedAt,
                })
                    .from(tasks)
                    .innerJoin(projects, eq(tasks.projectId, projects.id))
                    .leftJoin(users, eq(tasks.assigneeId, users.id))
                    .where(and(
                        or(eq(tasks.status, 'review'), eq(tasks.status, 'in_review')),
                        eq(tasks.isArchived, false)
                    ))
                    .orderBy(desc(tasks.updatedAt))
                    .limit(12),
        ]);

        // --- Project Stats ---
        const projectStats: Record<string, number> = {};
        let totalProjects = 0;
        projectRows.forEach((r) => {
            projectStats[r.status] = Number(r.cnt);
            totalProjects += Number(r.cnt);
        });
        const activeProjects = (projectStats['active'] || 0) + (projectStats['in_progress'] || 0);

        // --- Task Stats ---
        const taskStats: Record<string, number> = {};
        let totalTasks = 0;
        taskStatusRows.forEach((r) => {
            taskStats[r.status] = Number(r.cnt);
            totalTasks += Number(r.cnt);
        });

        const normalizedTaskStats = mergeStatusCounts(taskStats);
        const pendingReview = Number((pendingReviewCountResult as any[])[0]?.cnt || 0);

        const priorityStats: Record<string, number> = {};
        priorityRows.forEach((r) => {
            priorityStats[r.priority] = Number(r.cnt);
        });

        // --- Attendance ---
        const presentCount = currentMonthAttendance.filter((r) => r.status === 'present').length;
        const lateCount = currentMonthAttendance.filter((r) => r.status === 'late').length;
        const totalAttendanceDays = currentMonthAttendance.length;

        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        let workingDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
            if (day !== 0 && day !== 6) workingDays++;
        }

        const attendanceRate = workingDays > 0
            ? Math.round(((presentCount + lateCount) / workingDays) * 100)
            : 0;

        let totalCheckInMinutes = 0;
        let checkInsWithTime = 0;
        currentMonthAttendance.forEach((r) => {
            if (r.checkIn) {
                const d = new Date(r.checkIn);
                totalCheckInMinutes += d.getHours() * 60 + d.getMinutes();
                checkInsWithTime++;
            }
        });
        const avgCheckInTime = checkInsWithTime > 0
            ? `${String(Math.floor(totalCheckInMinutes / checkInsWithTime / 60)).padStart(2, '0')}:${String(Math.floor((totalCheckInMinutes / checkInsWithTime) % 60)).padStart(2, '0')}`
            : 'N/A';

        // --- Leave Stats ---
        const leaveByStatus: Record<string, number> = {};
        leaveStatusRows.forEach((r) => { leaveByStatus[r.status] = Number(r.cnt); });

        const leaveByType: Record<string, number> = {};
        leaveTypeRows.forEach((r) => { leaveByType[r.leaveType] = Number(r.cnt); });

        // --- Weekly Productivity ---
        const weekMap = new Map<string, number>();
        completedTasks.forEach((t) => {
            const d = new Date(t.updatedAt);
            const dayOfWeek = d.getDay();
            const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(d);
            monday.setDate(diff);
            const key = monday.toISOString().split('T')[0];
            weekMap.set(key, (weekMap.get(key) || 0) + 1);
        });

        const weeklyProductivity: { week: string; count: number }[] = [];
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const dayOfWeek = weekStart.getDay();
            const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            weekStart.setDate(diff);
            const key = weekStart.toISOString().split('T')[0];
            const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            weeklyProductivity.push({ week: label, count: weekMap.get(key) || 0 });
        }

        return {
            projects: {
                total: totalProjects,
                active: activeProjects,
                byStatus: projectStats,
            },
            tasks: {
                total: totalTasks,
                byStatus: normalizedTaskStats,
                byPriority: priorityStats,
                pendingReview,
                reviewQueue: reviewQueueRows.map((row) => ({
                    id: row.id,
                    title: row.title,
                    status: row.status === 'in_review' ? 'review' : row.status,
                    priority: row.priority,
                    projectId: row.projectId,
                    projectName: row.projectName,
                    assigneeId: row.assigneeId,
                    assigneeName: row.assigneeName || 'Unassigned',
                    updatedAt: row.updatedAt,
                })),
            },
            attendance: {
                rate: attendanceRate,
                presentCount,
                lateCount,
                totalDays: totalAttendanceDays,
                workingDays,
                avgCheckInTime,
            },
            leaves: {
                byStatus: leaveByStatus,
                byType: leaveByType,
                pending: leaveByStatus['pending'] || 0,
            },
            productivity: weeklyProductivity,
            recentActivity,
            workspace: {
                pendingMembers: Number((pendingMembersResult as any[])[0]?.cnt || 0),
                activeMembers: Number((activeMembersResult as any[])[0]?.cnt || 0),
                projectCount: totalProjects,
            },
        };
    }
}
