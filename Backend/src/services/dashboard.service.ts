import { db } from '../db/index';
import { eq, and, desc, gte, count, like } from 'drizzle-orm';
import { projects, tasks, attendance, leaveRequests, activityLogs, users } from '../db/schema';

export class DashboardService {
    static async getStats(userId: number) {
        const now = new Date();
        const eightWeeksAgo = new Date(now);
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        // Current month prefix for attendance LIKE filter (e.g. "2026-06")
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Run ALL stat queries concurrently — 8 sequential round trips → 1
        const [
            projectRows,
            taskStatusRows,
            priorityRows,
            currentMonthAttendance,
            leaveStatusRows,
            leaveTypeRows,
            completedTasks,
            recentActivity,
        ] = await Promise.all([
            // 1. Project stats by status
            db.select({ status: projects.status, cnt: count() })
                .from(projects)
                .groupBy(projects.status),

            // 2. Task stats by status
            db.select({ status: tasks.status, cnt: count() })
                .from(tasks)
                .groupBy(tasks.status),

            // 3. Task priority distribution
            db.select({ priority: tasks.priority, cnt: count() })
                .from(tasks)
                .groupBy(tasks.priority),

            // 4. Attendance — filter in DB by current month, NOT in memory
            db.select()
                .from(attendance)
                .where(and(
                    eq(attendance.userId, userId),
                    like(attendance.date, `${monthStr}%`)
                )),

            // 5. Leave stats by status
            db.select({ status: leaveRequests.status, cnt: count() })
                .from(leaveRequests)
                .where(eq(leaveRequests.userId, userId))
                .groupBy(leaveRequests.status),

            // 6. Leave stats by type
            db.select({ leaveType: leaveRequests.leaveType, cnt: count() })
                .from(leaveRequests)
                .where(eq(leaveRequests.userId, userId))
                .groupBy(leaveRequests.leaveType),

            // 7. Weekly productivity — tasks completed in last 8 weeks
            db.select({ updatedAt: tasks.updatedAt })
                .from(tasks)
                .where(and(
                    eq(tasks.status, 'done'),
                    gte(tasks.updatedAt, eightWeeksAgo)
                )),

            // 8. Recent activity logs with author name
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
            .orderBy(desc(activityLogs.createdAt))
            .limit(10),
        ]);

        // --- Process Project Stats ---
        const projectStats: Record<string, number> = {};
        let totalProjects = 0;
        projectRows.forEach((r) => {
            projectStats[r.status] = Number(r.cnt);
            totalProjects += Number(r.cnt);
        });
        const activeProjects = (projectStats['active'] || 0) + (projectStats['in_progress'] || 0);

        // --- Process Task Stats ---
        const taskStats: Record<string, number> = {};
        let totalTasks = 0;
        taskStatusRows.forEach((r) => {
            taskStats[r.status] = Number(r.cnt);
            totalTasks += Number(r.cnt);
        });

        const priorityStats: Record<string, number> = {};
        priorityRows.forEach((r) => {
            priorityStats[r.priority] = Number(r.cnt);
        });

        // --- Process Attendance (already month-filtered from DB) ---
        const presentCount = currentMonthAttendance.filter((r) => r.status === 'present').length;
        const lateCount = currentMonthAttendance.filter((r) => r.status === 'late').length;
        const totalAttendanceDays = currentMonthAttendance.length;

        // Working days in current month (Mon–Fri)
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

        // --- Process Leave Stats ---
        const leaveByStatus: Record<string, number> = {};
        leaveStatusRows.forEach((r) => { leaveByStatus[r.status] = Number(r.cnt); });

        const leaveByType: Record<string, number> = {};
        leaveTypeRows.forEach((r) => { leaveByType[r.leaveType] = Number(r.cnt); });

        // --- Process Weekly Productivity ---
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
            const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
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
