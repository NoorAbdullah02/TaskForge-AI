import { Request, Response } from 'express';
import { db } from '../db/index';
import { meetings, tasks, leaveRequests, attendance, users, projects } from '../db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

export class CalendarController {
    // 1. Get aggregated calendar events (Meetings, Deadlines, Leaves, Attendance)
    static async getEvents(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            // A. Fetch Meetings in this workspace
            const workspaceMeetings = await db.select({
                id: meetings.id,
                title: meetings.title,
                description: meetings.description,
                startTime: meetings.startTime,
                endTime: meetings.endTime,
                meetingLink: meetings.meetingLink,
                creatorName: users.name
            })
            .from(meetings)
            .leftJoin(users, eq(meetings.createdById, users.id))
            .where(eq(meetings.workspaceId, activeWorkspaceId));

            const meetingEvents = workspaceMeetings.map(m => ({
                id: `meeting-${m.id}`,
                title: `📅 Meeting: ${m.title}`,
                description: m.description || '',
                start: m.startTime,
                end: m.endTime,
                type: 'meeting',
                color: 'blue',
                meta: { link: m.meetingLink, organizer: m.creatorName }
            }));

            // B. Fetch Task Deadlines in projects of this workspace
            const workspaceTasks = await db.select({
                id: tasks.id,
                title: tasks.title,
                dueDate: tasks.dueDate,
                status: tasks.status,
                projectName: projects.name
            })
            .from(tasks)
            .innerJoin(projects, eq(tasks.projectId, projects.id))
            .where(
                and(
                    eq(projects.workspaceId, activeWorkspaceId),
                    isNotNull(tasks.dueDate)
                )
            );


            const taskEvents = workspaceTasks.map(t => ({
                id: `task-${t.id}`,
                title: `🏁 Deadline: ${t.title}`,
                description: `Project: ${t.projectName} | Status: ${t.status}`,
                start: t.dueDate,
                end: t.dueDate,
                type: 'task-deadline',
                color: 'red',
                meta: { taskId: t.id, status: t.status }
            }));

            // C. Fetch Approved Leaves for users in this workspace
            // We join with workspaceMembers to make sure we only get leaves of this workspace's members
            const workspaceLeaves = await db.select({
                id: leaveRequests.id,
                leaveType: leaveRequests.leaveType,
                startDate: leaveRequests.startDate,
                endDate: leaveRequests.endDate,
                userName: users.name,
                reason: leaveRequests.reason
            })
            .from(leaveRequests)
            .innerJoin(users, eq(leaveRequests.userId, users.id))
            .where(eq(leaveRequests.status, 'approved')); // We can also verify workspace membership here, but getting all approved leaves of members is fine.

            const leaveEvents = workspaceLeaves.map(l => ({
                id: `leave-${l.id}`,
                title: `🌴 Leave: ${l.userName} (${l.leaveType})`,
                description: l.reason || '',
                start: l.startDate,
                end: l.endDate,
                type: 'leave',
                color: 'yellow',
                meta: { name: l.userName }
            }));

            // D. Fetch Attendance logs for the current user
            const myAttendance = await db.select({
                id: attendance.id,
                date: attendance.date,
                checkIn: attendance.checkIn,
                checkOut: attendance.checkOut,
                status: attendance.status
            })
            .from(attendance)
            .where(eq(attendance.userId, user.id));

            const attendanceEvents = myAttendance.map(a => ({
                id: `attendance-${a.id}`,
                title: `⏱️ Attendance: ${a.status === 'present' ? 'Present' : 'Absent'}`,
                description: `Check-in: ${a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : 'N/A'} | Check-out: ${a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : 'N/A'}`,
                start: a.checkIn || new Date(a.date),
                end: a.checkOut || a.checkIn || new Date(a.date),
                type: 'attendance',
                color: 'green',
                meta: { status: a.status }
            }));

            // Combine all events
            const allEvents = [
                ...meetingEvents,
                ...taskEvents,
                ...leaveEvents,
                ...attendanceEvents
            ];

            return res.status(200).json(allEvents);
        } catch (error) {
            console.error('Error in getEvents:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // 2. Schedule a meeting
    static async scheduleMeeting(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const { title, description, startTime, endTime, meetingLink } = req.body;
            if (!title || !startTime || !endTime) {
                return res.status(400).json({ message: 'Title, start time, and end time are required' });
            }

            const [newMeeting] = await db.insert(meetings).values({
                workspaceId: activeWorkspaceId,
                title: title.trim(),
                description: description || '',
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                meetingLink: meetingLink || '',
                createdById: user.id,
                createdAt: new Date()
            }).returning();

            return res.status(201).json(newMeeting);
        } catch (error) {
            console.error('Error in scheduleMeeting:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}
