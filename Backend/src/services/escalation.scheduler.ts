import cron from 'node-cron';
import { db } from '../db/index';
import { eq, and, ne, inArray, sql, desc, gte } from 'drizzle-orm';
import { tasks, users, projects, projectMembers, teams, workspaces, workspaceMembers, aiRequests, attendance } from '../db/schema';
import { sendMail } from '../lib/send-email';
import { socketService } from './socket.service';
import { generateJSONResponse, generateTextResponse } from '../lib/gemini';
import { EmailTriggerService } from './emailTrigger.service';
import { TaskService } from './task.service';
import { NotificationService } from './notification.service';



export function startEscalationScheduler() {
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Running daily Auto Escalation and Recurrence check...');
        try {
            await runEscalationCheck();
            await checkRecurringTasks();
        } catch (err) {
            console.error('Error running daily escalation and recurrence check:', err);
        }
    });

    // Run daily standups at 9:00 AM: 0 9 * * *
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ Running automated Daily Standup generator...');
        try {
            await runSystemDailyStandups();
        } catch (err) {
            console.error('Error running daily standup generation:', err);
        }
    });

    // Run weekly reports every Sunday at 11:59 PM: 59 23 * * 0
    cron.schedule('59 23 * * 0', async () => {
        console.log('⏰ Running Sunday Weekly Report scheduler...');
        try {
            await runSystemWeeklySummaries();
        } catch (err) {
            console.error('Error running weekly summaries:', err);
        }
    });
}


export async function runEscalationCheck() {
    const now = new Date();
    // Query active overdue tasks
    const activeOverdueTasks = await db.select()
        .from(tasks)
        .where(
            and(
                ne(tasks.status, 'done'),
                ne(tasks.status, 'completed'),
                sql`due_date IS NOT NULL`,
                sql`due_date < NOW()`
            )
        );

    for (const task of activeOverdueTasks) {
        if (!task.dueDate) continue;

        const timeDiff = now.getTime() - new Date(task.dueDate).getTime();
        const daysOverdue = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) continue;

        // Fetch assignee details
        let assignee: any = null;
        if (task.assigneeId) {
            const [userRow] = await db.select().from(users).where(eq(users.id, task.assigneeId));
            assignee = userRow;
        }

        // Fetch project and workspace details
        const [project] = await db.select().from(projects).where(eq(projects.id, task.projectId));
        if (!project || !project.workspaceId) continue;
        
        const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, project.workspaceId));
        if (!workspace || !workspace.ownerId) continue;

        // Find Team Leader (assignee's team leader)
        let teamLeader: any = null;
        if (assignee && assignee.teamId) {
            const [team] = await db.select().from(teams).where(eq(teams.id, assignee.teamId));
            if (team && team.leaderId) {
                const [leaderRow] = await db.select().from(users).where(eq(users.id, team.leaderId));
                teamLeader = leaderRow;
            }
        }

        // Find Project Manager / Project Owner
        let projectManager: any = null;
        const pmMembers = await db.select()
            .from(projectMembers)
            .where(
                and(
                    eq(projectMembers.projectId, task.projectId),
                    inArray(projectMembers.role, ['owner', 'manager'])
                )
            );
        if (pmMembers.length > 0) {
            const [pmRow] = await db.select().from(users).where(eq(users.id, pmMembers[0].userId));
            projectManager = pmRow;
        }

        // Fallback for Team Leader and PM: if not found, use department manager or project member or workspace owner
        const [workspaceOwner] = await db.select().from(users).where(eq(users.id, workspace.ownerId));

        if (!projectManager) {
            projectManager = workspaceOwner;
        }
        if (!teamLeader) {
            teamLeader = projectManager;
        }

        // Escalation Levels
        // Level 5: Day 10 (Critical Escalation - alert all, force priority to critical)
        if (daysOverdue >= 10 && task.escalationLevel < 5) {
            // Update priority to critical in DB
            await db.update(tasks)
                .set({ priority: 'critical' })
                .where(eq(tasks.id, task.id));

            // Notify everyone
            const recipients = [
                assignee,
                teamLeader,
                projectManager,
                workspaceOwner
            ].filter(Boolean);

            // De-duplicate recipients
            const uniqueRecipients = Array.from(new Map(recipients.map(r => [r.id, r])).values());

            for (const rec of uniqueRecipients) {
                await triggerEscalation(
                    rec.id,
                    rec.email,
                    `CRITICAL ESCALATION: "${task.title}" is 10+ days overdue`,
                    `Hi ${rec.name},\n\nCRITICAL ESCALATION: The task "${task.title}" in project "${project.name}" is now ${daysOverdue} days overdue.\n\nIts priority has been automatically escalated to CRITICAL.\n\nAssignee: ${assignee?.name || 'Unassigned'}\nTeam Leader: ${teamLeader?.name || 'N/A'}\nProject Manager: ${projectManager?.name || 'N/A'}\nWorkspace Admin: ${workspaceOwner?.name || 'N/A'}`,
                    5,
                    task.id
                );
            }
        }
        // Level 4: Day 7 (Workspace Admin Alert)
        else if (daysOverdue >= 7 && task.escalationLevel < 4) {
            if (workspaceOwner) {
                await triggerEscalation(
                    workspaceOwner.id,
                    workspaceOwner.email,
                    `Critical Workspace Task Escalation: "${task.title}" is 7 days overdue`,
                    `Hi ${workspaceOwner.name},\n\nThis is a high-level workspace escalation alert that the task "${task.title}" in project "${project.name}" is now ${daysOverdue} days overdue.\n\nAssignee: ${assignee?.name || 'Unassigned'}\nProject Manager: ${projectManager?.name || 'N/A'}`,
                    4,
                    task.id
                );
            }
        }
        // Level 3: Day 5 (Project Manager Alert)
        else if (daysOverdue >= 5 && task.escalationLevel < 3) {
            if (projectManager) {
                await triggerEscalation(
                    projectManager.id,
                    projectManager.email,
                    `Escalated Task Alert: "${task.title}" is 5 days overdue`,
                    `Hi ${projectManager.name},\n\nThis is an escalation alert that the task "${task.title}" assigned to ${assignee?.name || 'Unassigned'} under project "${project.name}" is now ${daysOverdue} days overdue.\n\nActions may be required to resolve this delay.`,
                    3,
                    task.id
                );
            }
        }
        // Level 2: Day 3 (Team Leader Alert)
        else if (daysOverdue >= 3 && task.escalationLevel < 2) {
            if (teamLeader) {
                await triggerEscalation(
                    teamLeader.id,
                    teamLeader.email,
                    `Overdue Task Alert: "${task.title}" (Assignee: ${assignee?.name || 'Unassigned'})`,
                    `Hi ${teamLeader.name},\n\nThis is an alert that the task "${task.title}" assigned to ${assignee?.name || 'Unassigned'} under project "${project.name}" is now ${daysOverdue} days overdue.\n\nPlease follow up on this task.`,
                    2,
                    task.id
                );
            }
        }
        // Level 1: Day 1 (Employee Reminder)
        else if (daysOverdue >= 1 && task.escalationLevel < 1) {
            if (assignee) {
                await triggerEscalation(
                    assignee.id,
                    assignee.email,
                    `Overdue Task Reminder: "${task.title}"`,
                    `Hi ${assignee.name},\n\nThis is a reminder that your task "${task.title}" under project "${project.name}" was due on ${new Date(task.dueDate).toDateString()} and is now overdue.\n\nPlease update its status as soon as possible.`,
                    1,
                    task.id
                );
            }
        }
    }
}

async function triggerEscalation(userId: number, email: string, subject: string, content: string, level: number, taskId: number) {
    // 1. Email notification
    try {
        await sendMail(email, subject, `<div style="white-space: pre-wrap; font-family: sans-serif; color: #f3f4f6; background-color: #111827; padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">${content}</div>`);
    } catch (err) {
        console.error(`Failed to send escalation email to ${email}:`, err);
    }

    // 2. In-app and socket notification
    try {
        await NotificationService.dispatch({
            event: 'task.deadline',
            userId,
            entityType: 'task',
            entityId: taskId,
            title: subject,
            message: content,
            skipEmail: true,
        });
    } catch (err) {
        console.error(`Failed to dispatch notification to user ${userId}:`, err);
    }

    // 3. Update task escalation level and date in DB
    try {
        await db.update(tasks)
            .set({ 
                escalationLevel: level,
                lastEscalatedAt: new Date()
            })
            .where(eq(tasks.id, taskId));
    } catch (err) {
        console.error(`Failed to update task ${taskId} escalation level:`, err);
    }
}

export async function runSystemDailyStandups() {
    console.log('Starting automated Daily Standup generation for all active workspace members...');
    
    const members = await db.selectDistinct({ userId: workspaceMembers.userId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.status, 'active'));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    for (const m of members) {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, m.userId));
            if (!user) continue;

            const userTasks = await db.select().from(tasks).where(eq(tasks.assigneeId, user.id));
            const completedYesterday = userTasks.filter(t => (t.status === 'done' || t.status === 'completed') && t.updatedAt >= yesterday);
            const pendingToday = userTasks.filter(t => t.status !== 'done' && t.status !== 'completed');
            const blockers = pendingToday.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

            const prompt = `You are a professional Scrum Master. Based on the user's task updates, compile a clean, structured Daily Standup report.
User: ${user.name}
Completed Yesterday:
${completedYesterday.map(t => `- ${t.title}`).join('\n') || "None"}
In Progress / Planned for Today:
${pendingToday.slice(0, 5).map(t => `- ${t.title} (Priority: ${t.priority})`).join('\n') || "None"}
Blockers & Overdue items:
${blockers.map(t => `- ${t.title} is overdue! (Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'})`).join('\n') || "None"}

Respond ONLY with a JSON object.
Do not include any markdown formatting, prefix or suffix like \`\`\`json. Return only the raw JSON.
JSON structure:
{
  "yesterday": "Detailed summary of achievements from yesterday.",
  "today": "List of planned activities and focus areas for today.",
  "blockers": "Any blockers, warnings, or overdue risk summaries, or 'None' if clear."
}`;

            const responseJSON = await generateJSONResponse(prompt);

            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'daily-standup',
                promptText: 'System daily automated standup generation',
                responseText: JSON.stringify(responseJSON),
                status: 'success'
            });

            console.log(`Generated automated standup for ${user.name}`);
        } catch (err) {
            console.error(`Failed to generate standup for user ${m.userId}:`, err);
        }
    }
}

export async function runSystemWeeklySummaries() {
    console.log('Starting automated Weekly Report generation and emailing for all active workspace members...');

    const members = await db.select({
        userId: workspaceMembers.userId,
        workspaceId: workspaceMembers.workspaceId
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.status, 'active'));

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    for (const m of members) {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, m.userId));
            if (!user) continue;

            const wsProjects = await db.select().from(projects).where(eq(projects.workspaceId, m.workspaceId));
            if (wsProjects.length === 0) continue;

            const projectIds = wsProjects.map(p => p.id);
            const wsTasks = await db.select().from(tasks).where(inArray(tasks.projectId, projectIds));

            const totalTasksCount = wsTasks.length;
            const completedTasksCount = wsTasks.filter(t => t.status?.toLowerCase() === 'done').length;
            const projectHealthScore = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100;

            const userTasks = wsTasks.filter(t => t.assigneeId === user.id);
            const pendingTasks = userTasks.filter(t => t.status?.toLowerCase() !== 'done');
            const completedTasks = userTasks.filter(t => t.status?.toLowerCase() === 'done');
            const delayedTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);

            // Fetch user attendance for last 7 days
            const attendanceLogs = await db.select().from(attendance).where(eq(attendance.userId, user.id));
            const weeklyAttendance = attendanceLogs.filter(a => {
                const checkInDate = a.checkIn ? new Date(a.checkIn) : new Date(a.date);
                return checkInDate >= sevenDaysAgo;
            });

            const presentCount = weeklyAttendance.filter(a => a.status === 'present').length;
            const lateCount = weeklyAttendance.filter(a => a.status === 'late').length;
            const absentCount = weeklyAttendance.filter(a => a.status === 'absent').length;

            const prompt = `You are TaskForge AI Weekly Email Assistant. Analyze the user's weekly performance and write a concise, motivational, executive summary email report.
User: ${user.name}
Active Workspace Projects: ${wsProjects.map(p => p.name).join(', ')}
Project Health Score (Workspace-wide): ${projectHealthScore}%

User Personal Task Statistics:
- Pending Tasks count: ${pendingTasks.length}
${pendingTasks.slice(0, 5).map(t => `  * ${t.title} (Priority: ${t.priority || 'medium'})`).join('\n')}
- Completed Tasks count: ${completedTasks.length}
${completedTasks.slice(0, 5).map(t => `  * ${t.title}`).join('\n')}
- Delayed/Overdue Tasks count: ${delayedTasks.length}
${delayedTasks.slice(0, 5).map(t => `  * ${t.title} (Was due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'})`).join('\n')}

User Weekly Attendance Summary:
- Present days: ${presentCount}
- Late check-ins: ${lateCount}
- Absent days: ${absentCount}

Please generate a professional weekly executive summary. Highlight achievements, point out overdue items clearly as action items, analyze their attendance, and give a productivity recommendation. Keep it under 250 words and format it in clear HTML-friendly tags like <p>, <ul>, <li>, and <strong>.`;

            const summary = await generateTextResponse(prompt);

            await EmailTriggerService.sendAIGeneratedReport(user.email, user.name, summary, m.workspaceId);

            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'weekly-summary',
                promptText: `Automated weekly summary for user ${user.id} in workspace ${m.workspaceId}`,
                responseText: summary,
                status: 'success'
            });

            console.log(`Generated and emailed automated weekly report to ${user.email}`);
        } catch (err) {
            console.error(`Failed to generate weekly summary for user ${m.userId}:`, err);
        }
    }
}

export async function checkRecurringTasks() {
    console.log('⏰ Running check for recurring tasks...');
    try {
        const now = new Date();
        const recurringTasksList = await db.select({
            task: tasks,
            workspaceId: projects.workspaceId
        })
            .from(tasks)
            .leftJoin(projects, eq(tasks.projectId, projects.id))
            .where(eq(tasks.isRecurring, true));

        for (const row of recurringTasksList) {
            const task = row.task;
            const workspaceId = row.workspaceId;
            let nextDate = task.nextRecurrenceAt;

            // If nextRecurrenceAt is null, initialize it
            if (!nextDate) {
                nextDate = new Date(task.createdAt || now);
                nextDate = calculateNextRecurrence(nextDate, task.recurrenceCron || 'daily');
                await db.update(tasks)
                    .set({ nextRecurrenceAt: nextDate })
                    .where(eq(tasks.id, task.id));
                continue;
            }

            if (nextDate <= now) {
                // Time to recur! Duplicate task
                console.log(`🔄 Task "${task.title}" is recurring. Duplicating...`);
                const dup = await TaskService.duplicateTask(task.id, 0); // 0 representing system user

                // Calculate next recurrence date
                const nextRecurrence = calculateNextRecurrence(nextDate, task.recurrenceCron || 'daily');

                // Update original task
                await db.update(tasks)
                    .set({
                        lastRecurredAt: now,
                        nextRecurrenceAt: nextRecurrence,
                        updatedAt: now
                    })
                    .where(eq(tasks.id, task.id));

                // Send notification to assignee/watchers if they exist
                if (task.assigneeId) {
                    await NotificationService.dispatch({
                        event: 'task.assigned',
                        userId: task.assigneeId,
                        workspaceId: workspaceId,
                        entityType: 'task',
                        entityId: dup.id,
                        title: 'Recurring Task Spawned',
                        message: `Task "${task.title}" has recurred. New task: "${dup.title}".`,
                        link: `/tasks/${dup.id}`,
                        skipEmail: true,
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error checking recurring tasks:', error);
    }
}

function calculateNextRecurrence(current: Date, cronInterval: string): Date {
    const next = new Date(current);
    if (cronInterval === 'daily') {
        next.setDate(next.getDate() + 1);
    } else if (cronInterval === 'weekly') {
        next.setDate(next.getDate() + 7);
    } else if (cronInterval === 'monthly') {
        next.setMonth(next.getMonth() + 1);
    } else {
        next.setDate(next.getDate() + 1); // default daily
    }
    return next;
}

