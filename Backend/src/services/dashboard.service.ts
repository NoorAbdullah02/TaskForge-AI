import { db } from '../db/index';
import { eq, and, sql, desc, gte, count } from 'drizzle-orm';
import { projects, tasks, attendance, leaveRequests, activityLogs, users } from '../db/schema';

export class DashboardService {
    static async getStats(userId: number) {
        // 1. Project stats
        const projectRows = await db.select({
            status: projects.status,
            cnt: count()
        }).from(projects).groupBy(projects.status);

        const projectStats: Record<string, number> = {};
        let totalProjects = 0;
        projectRows.forEach((r) => {
            projectStats[r.status] = Number(r.cnt);
            totalProjects += Number(r.cnt);
        });
        const activeProjects = (projectStats['active'] || 0) + (projectStats['in_progress'] || 0);

        // 2. Task stats
        const taskRows = await db.select({
            status: tasks.status,
            cnt: count()
        }).from(tasks).groupBy(tasks.status);

        const taskStats: Record<string, number> = {};
        let totalTasks = 0;
        taskRows.forEach((r) => {
            taskStats[r.status] = Number(r.cnt);
            totalTasks += Number(r.cnt);
        });

        // 3. Task priority distribution
        const priorityRows = await db.select({
            priority: tasks.priority,
            cnt: count()
        }).from(tasks).groupBy(tasks.priority);

        const priorityStats: Record<string, number> = {};
        priorityRows.forEach((r) => {
            priorityStats[r.priority] = Number(r.cnt);
        });

        // 4. Attendance stats for current month
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const attendanceRows = await db.select()
            .from(attendance)
            .where(eq(attendance.userId, userId));

        const currentMonthRecords = attendanceRows.filter((r) => r.date.startsWith(monthStr));

        const presentCount = currentMonthRecords.filter((r) => r.status === 'present').length;
        const lateCount = currentMonthRecords.filter((r) => r.status === 'late').length;
        const totalAttendanceDays = currentMonthRecords.length;

        // Working days in current month (approx Mon-Fri)
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        let workingDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
            if (day !== 0 && day !== 6) workingDays++;
        }

        const attendanceRate = workingDays > 0
            ? Math.round(((presentCount + lateCount) / workingDays) * 100)
            : 0;

        // Average check-in time
        let totalCheckInMinutes = 0;
        let checkInsWithTime = 0;
        currentMonthRecords.forEach((r) => {
            if (r.checkIn) {
                const d = new Date(r.checkIn);
                totalCheckInMinutes += d.getHours() * 60 + d.getMinutes();
                checkInsWithTime++;
            }
        });
        const avgCheckInTime = checkInsWithTime > 0
            ? `${String(Math.floor(totalCheckInMinutes / checkInsWithTime / 60)).padStart(2, '0')}:${String(Math.floor((totalCheckInMinutes / checkInsWithTime) % 60)).padStart(2, '0')}`
            : 'N/A';

        // 5. Leave stats
        const leaveStatusRows = await db.select({
            status: leaveRequests.status,
            cnt: count()
        }).from(leaveRequests)
            .where(eq(leaveRequests.userId, userId))
            .groupBy(leaveRequests.status);

        const leaveByStatus: Record<string, number> = {};
        leaveStatusRows.forEach((r) => {
            leaveByStatus[r.status] = Number(r.cnt);
        });

        const leaveTypeRows = await db.select({
            leaveType: leaveRequests.leaveType,
            cnt: count()
        }).from(leaveRequests)
            .where(eq(leaveRequests.userId, userId))
            .groupBy(leaveRequests.leaveType);

        const leaveByType: Record<string, number> = {};
        leaveTypeRows.forEach((r) => {
            leaveByType[r.leaveType] = Number(r.cnt);
        });

        // 6. Weekly productivity (tasks completed per week, last 8 weeks)
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const completedTasks = await db.select({
            updatedAt: tasks.updatedAt,
        }).from(tasks)
            .where(and(
                eq(tasks.status, 'done'),
                gte(tasks.updatedAt, eightWeeksAgo)
            ));

        // Group by week
        const weeklyProductivity: { week: string; count: number }[] = [];
        const weekMap = new Map<string, number>();

        completedTasks.forEach((t) => {
            const d = new Date(t.updatedAt);
            // Get ISO week start (Monday)
            const dayOfWeek = d.getDay();
            const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(d);
            monday.setDate(diff);
            const key = monday.toISOString().split('T')[0];
            weekMap.set(key, (weekMap.get(key) || 0) + 1);
        });

        // Fill in empty weeks
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const dayOfWeek = weekStart.getDay();
            const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            weekStart.setDate(diff);
            const key = weekStart.toISOString().split('T')[0];
            const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            weeklyProductivity.push({
                week: label,
                count: weekMap.get(key) || 0
            });
        }

        // 7. Recent activity logs
        const recentActivity = await db.select({
            id: activityLogs.id,
            action: activityLogs.action,
            entityType: activityLogs.entityType,
            entityId: activityLogs.entityId,
            details: activityLogs.details,
            createdAt: activityLogs.createdAt,
            userName: users.name,
        }).from(activityLogs)
            .leftJoin(users, eq(activityLogs.userId, users.id))
            .orderBy(desc(activityLogs.createdAt))
            .limit(10);

        return {
            projects: {
                total: totalProjects,
                active: activeProjects,
                byStatus: projectStats,
            },
            tasks: {
                total: totalTasks,
                byStatus: taskStats,
                byPriority: priorityStats,
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
        };
    }
}
