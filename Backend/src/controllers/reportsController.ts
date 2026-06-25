import { Request, Response } from 'express';
import { db } from '../db/index';
import { users, projects, tasks, attendance, teams, projectMembers } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { EmailTriggerService } from '../services/emailTrigger.service';
import { ProjectService } from '../services/project.service';

export class ReportsController {
    static async emailReport(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) {
                return res.status(400).json({ message: 'No active workspace selected' });
            }

            const { reportType, filters, recipientEmail } = req.body;
            if (!reportType || !recipientEmail) {
                return res.status(400).json({ message: 'reportType and recipientEmail are required' });
            }

            const targetEmail = recipientEmail.trim().toLowerCase();

            if (reportType === 'attendance') {
                const year = filters?.year ? parseInt(filters.year, 10) : new Date().getFullYear();
                const month = filters?.month ? parseInt(filters.month, 10) : new Date().getMonth() + 1;
                const userId = filters?.userId ? parseInt(filters.userId, 10) : user.id;

                const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
                if (!targetUser) return res.status(404).json({ message: 'User not found' });

                // Fetch attendance logs
                const logs = await db.select().from(attendance).where(eq(attendance.userId, userId));
                const filteredLogs = logs.filter(l => {
                    const d = l.checkIn ? new Date(l.checkIn) : new Date(l.date);
                    return d.getFullYear() === year && (d.getMonth() + 1) === month;
                });

                const presentCount = filteredLogs.filter(l => l.status === 'present').length;
                const lateCount = filteredLogs.filter(l => l.status === 'late').length;
                const absentCount = filteredLogs.filter(l => l.status === 'absent').length;

                const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
                const summaryText = `
                    <p>Total Working Days Tracked: <strong>${filteredLogs.length}</strong></p>
                    <ul>
                        <li>Present Days: <strong>${presentCount}</strong></li>
                        <li>Late Arrivals: <strong>${lateCount}</strong></li>
                        <li>Absences Flagged: <strong>${absentCount}</strong></li>
                    </ul>
                    <p>Compliance Rate: <strong>${filteredLogs.length > 0 ? Math.round(((presentCount + lateCount) / filteredLogs.length) * 100) : 100}%</strong></p>
                `;

                await EmailTriggerService.sendMonthlyAttendanceReport(
                    targetEmail,
                    targetUser.name,
                    `${monthName} ${year}`,
                    summaryText,
                    activeWorkspaceId
                );

            } else if (reportType === 'project') {
                const projectId = parseInt(filters?.projectId, 10);
                if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });

                const projectDetails = await ProjectService.getProjectDetails(projectId);
                if (!projectDetails) return res.status(404).json({ message: 'Project not found' });

                const totalTasks = projectDetails.tasks.length;
                const completedTasks = projectDetails.tasks.filter(t => t.status?.toLowerCase() === 'done').length;
                const inProgressTasks = projectDetails.tasks.filter(t => t.status?.toLowerCase() === 'in_progress' || t.status?.toLowerCase() === 'review').length;

                const summaryStats = `
                    <p>Project Name: <strong>${projectDetails.name}</strong></p>
                    <p>Status: <strong>${projectDetails.status}</strong></p>
                    <ul>
                        <li>Total Project Tasks: <strong>${totalTasks}</strong></li>
                        <li>Completed Tasks: <strong>${completedTasks}</strong></li>
                        <li>In-Progress/Review Tasks: <strong>${inProgressTasks}</strong></li>
                    </ul>
                    <p>Overall Progress: <strong>${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</strong></p>
                `;

                await EmailTriggerService.sendWeeklyProjectSummary(
                    targetEmail,
                    user.name,
                    projectDetails.name,
                    summaryStats,
                    activeWorkspaceId
                );

            } else if (reportType === 'team') {
                const teamId = parseInt(filters?.teamId, 10);
                if (isNaN(teamId)) return res.status(400).json({ message: 'Invalid Team ID' });

                const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
                if (!team) return res.status(404).json({ message: 'Team not found' });

                const summaryStats = `
                    <p>Team Name: <strong>${team.name}</strong></p>
                    <p>Department: <strong>${team.departmentName || 'General'}</strong></p>
                    <p>Team size: <strong>${team.memberCount || 1} members</strong></p>
                    <p>This report contains performance analytics for ${team.name} team members inside the current active workspace.</p>
                `;

                await EmailTriggerService.sendWeeklyProjectSummary(
                    targetEmail,
                    user.name,
                    `Squad Report: ${team.name}`,
                    summaryStats,
                    activeWorkspaceId
                );

            } else if (reportType === 'productivity') {
                // Fetch workspace projects and compute productivity ratios
                const wsProjects = await db.select().from(projects).where(eq(projects.workspaceId, activeWorkspaceId));
                let completed = 0;
                let pending = 0;

                if (wsProjects.length > 0) {
                    const projectIds = wsProjects.map(p => p.id);
                    const wsTasks = await db.select().from(tasks).where(inArray(tasks.projectId, projectIds));
                    completed = wsTasks.filter(t => t.status?.toLowerCase() === 'done').length;
                    pending = wsTasks.filter(t => t.status?.toLowerCase() !== 'done').length;
                }

                const summaryStats = `
                    <p>Workspace Performance Overview</p>
                    <ul>
                        <li>Total Active Projects: <strong>${wsProjects.length}</strong></li>
                        <li>Completed Tasks: <strong>${completed}</strong></li>
                        <li>Pending Action Items: <strong>${pending}</strong></li>
                    </ul>
                    <p>Productivity Efficiency: <strong>${(completed + pending) > 0 ? Math.round((completed / (completed + pending)) * 100) : 100}%</strong></p>
                `;

                await EmailTriggerService.sendWeeklyProjectSummary(
                    targetEmail,
                    user.name,
                    'Global Productivity Report',
                    summaryStats,
                    activeWorkspaceId
                );
            } else {
                return res.status(400).json({ message: 'Invalid reportType specified' });
            }

            return res.status(200).json({ success: true, message: `Report emailed successfully to ${targetEmail}` });
        } catch (error: any) {
            console.error('Error in emailReport:', error);
            return res.status(500).json({ message: error.message || 'Failed to send email report' });
        }
    }
}
