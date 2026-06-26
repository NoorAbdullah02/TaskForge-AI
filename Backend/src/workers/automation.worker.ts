import { Worker, Job } from 'bullmq';
import { db } from '../db';
import {
  users,
  tasks,
  projects,
  attendance,
  leaveRequests,
  workspaces,
  automationLogs,
  projectMembers,
  emailLogs,
} from '../db/schema';
import { NotificationService } from '../services/notification.service';
import { sql, eq, and, ne, lte, gte, isNull } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { bullMqConnection } from '../lib/queue';

export const automationWorker = new Worker(
  'automation-queue',
  async (job: Job) => {
    const jobType = job.name;
    const startTime = Date.now();
    logger.info(`🤖 Starting automation job: ${jobType} (Job ID: ${job.id})`);

    try {
      switch (jobType) {
        case 'dailySummary':
          await handleDailySummary();
          break;
        case 'weeklyReport':
          await handleWeeklyReport();
          break;
        case 'monthlyReport':
          await handleMonthlyReport();
          break;
        case 'taskReminder':
          await handleTaskReminder();
          break;
        case 'deadlineAlert':
          await handleDeadlineAlert();
          break;
        case 'attendanceReminder':
          await handleAttendanceReminder();
          break;
        case 'birthdayWishes':
          await handleBirthdayWishes();
          break;
        case 'projectAnniversary':
          await handleProjectAnniversary();
          break;
        case 'leaveExpiryReminder':
          await handleLeaveExpiryReminder();
          break;
        case 'workspaceReminder':
          await handleWorkspaceReminder();
          break;
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }

      const duration = Date.now() - startTime;
      await db.insert(automationLogs).values({
        jobType,
        status: 'success',
        ranAt: new Date(),
        duration,
        details: `Successfully completed job ${jobType}`,
      });
      logger.info(`✅ Automation job ${jobType} completed in ${duration}ms`);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      await db.insert(automationLogs).values({
        jobType,
        status: 'failed',
        ranAt: new Date(),
        duration,
        details: `Failed: ${err.message || JSON.stringify(err)}`,
      });
      logger.error(`❌ Automation job ${jobType} failed: ${err.message || err}`);
      throw err;
    }
  },
  {
    connection: bullMqConnection,
    concurrency: 2,
  }
);

// 1. Daily Summary
async function handleDailySummary() {
  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    // Get active tasks
    const activeTasksList = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.assigneeId, user.id), ne(tasks.status, 'done'), eq(tasks.isArchived, false)));

    // Get overdue tasks
    const now = new Date();
    const overdueTasksList = activeTasksList.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now
    );

    if (activeTasksList.length === 0 && overdueTasksList.length === 0) {
      continue; // Skip if no tasks
    }

    const activeTasksHtml = activeTasksList
      .map(
        (t) =>
          `<li><strong>${t.title}</strong> - Priority: ${t.priority} ${
            t.dueDate ? `(Due: ${t.dueDate.toLocaleDateString()})` : ''
          }</li>`
      )
      .join('');

    const overdueTasksHtml = overdueTasksList
      .map(
        (t) =>
          `<li style="color: #f87171;"><strong>${t.title}</strong> ${
            t.dueDate ? `(Overdue since: ${t.dueDate.toLocaleDateString()})` : ''
          }</li>`
      )
      .join('');

    await NotificationService.dispatch({
      event: 'dailySummary',
      userId: user.id,
      title: 'Your Daily Task Digest',
      message: `You have ${activeTasksList.length} active tasks and ${overdueTasksList.length} overdue tasks today.`,
      emailTemplate: 'dailySummary',
      emailData: {
        activeTasksHtml: activeTasksHtml ? `<ul>${activeTasksHtml}</ul>` : '',
        overdueTasksHtml: overdueTasksHtml ? `<ul>${overdueTasksHtml}</ul>` : '',
      },
    });
  }
}

// 2. Weekly Report
async function handleWeeklyReport() {
  const activeWorkspaces = await db.select().from(workspaces).where(eq(workspaces.status, 'active'));
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const ws of activeWorkspaces) {
    if (!ws.ownerId) continue;

    // Get stats
    const allWsProjects = await db.select().from(projects).where(eq(projects.workspaceId, ws.id));
    const projectIds = allWsProjects.map((p) => p.id);

    if (projectIds.length === 0) continue;

    // Tasks completed in last 7 days
    const completedTasks = await db
      .select()
      .from(tasks)
      .where(
        sql`${tasks.projectId} IN ${projectIds} AND ${tasks.status} = 'done' AND ${tasks.updatedAt} >= ${sevenDaysAgo}`
      );

    // Tasks created in last 7 days
    const createdTasks = await db
      .select()
      .from(tasks)
      .where(sql`${tasks.projectId} IN ${projectIds} AND ${tasks.createdAt} >= ${sevenDaysAgo}`);

    // Open tasks
    const openTasks = await db
      .select()
      .from(tasks)
      .where(sql`${tasks.projectId} IN ${projectIds} AND ${tasks.status} != 'done'`);

    const detailsHtml = `
      <p>Here is a summary of the activity in your workspace this past week:</p>
      <ul>
        <li><strong>${completedTasks.length}</strong> tasks completed</li>
        <li><strong>${createdTasks.length}</strong> new tasks created</li>
        <li><strong>${openTasks.length}</strong> tasks currently in progress or pending</li>
      </ul>
    `;

    await NotificationService.dispatch({
      event: 'weeklyReport',
      userId: ws.ownerId,
      workspaceId: ws.id,
      title: `Weekly Workspace Report: ${ws.name}`,
      message: `Weekly report for ${ws.name} is ready. ${completedTasks.length} tasks completed this week.`,
      emailTemplate: 'weeklyReport',
      emailData: {
        workspaceName: ws.name,
        completedCount: completedTasks.length,
        createdCount: createdTasks.length,
        openCount: openTasks.length,
        detailsHtml,
      },
    });
  }
}

// 3. Monthly Report
async function handleMonthlyReport() {
  const activeWorkspaces = await db.select().from(workspaces).where(eq(workspaces.status, 'active'));
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const ws of activeWorkspaces) {
    if (!ws.ownerId) continue;

    const allWsProjects = await db.select().from(projects).where(eq(projects.workspaceId, ws.id));
    const projectIds = allWsProjects.map((p) => p.id);

    if (projectIds.length === 0) continue;

    // Tasks completed in last 30 days
    const completedTasks = await db
      .select()
      .from(tasks)
      .where(
        sql`${tasks.projectId} IN ${projectIds} AND ${tasks.status} = 'done' AND ${tasks.updatedAt} >= ${thirtyDaysAgo}`
      );

    // Tasks created in last 30 days
    const createdTasks = await db
      .select()
      .from(tasks)
      .where(sql`${tasks.projectId} IN ${projectIds} AND ${tasks.createdAt} >= ${thirtyDaysAgo}`);

    // Open tasks
    const openTasks = await db
      .select()
      .from(tasks)
      .where(sql`${tasks.projectId} IN ${projectIds} AND ${tasks.status} != 'done'`);

    const detailsHtml = `
      <p>Here is a summary of the activity in your workspace this past month:</p>
      <ul>
        <li><strong>${completedTasks.length}</strong> tasks completed</li>
        <li><strong>${createdTasks.length}</strong> new tasks created</li>
        <li><strong>${openTasks.length}</strong> tasks currently active</li>
      </ul>
    `;

    await NotificationService.dispatch({
      event: 'monthlyReport',
      userId: ws.ownerId,
      workspaceId: ws.id,
      title: `Monthly Workspace Report: ${ws.name}`,
      message: `Monthly analytics report for ${ws.name} is ready.`,
      emailTemplate: 'monthlyReport',
      emailData: {
        workspaceName: ws.name,
        completedCount: completedTasks.length,
        createdCount: createdTasks.length,
        activeCount: openTasks.length,
        detailsHtml,
      },
    });
  }
}

// 4. Task Reminder (run twice daily)
async function handleTaskReminder() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Find tasks due today
  const tasksDueToday = await db
    .select()
    .from(tasks)
    .where(and(gte(tasks.dueDate, todayStart), lte(tasks.dueDate, todayEnd), ne(tasks.status, 'done')));

  for (const task of tasksDueToday) {
    if (!task.assigneeId) continue;

    // Get project name
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, task.projectId))
      .limit(1)
      .then((res) => res[0]);

    await NotificationService.dispatch({
      event: 'task.deadline',
      userId: task.assigneeId,
      entityType: 'task',
      entityId: task.id,
      title: `Task Due Today: ${task.title}`,
      message: `Reminder: your task "${task.title}" is due today.`,
      emailTemplate: 'taskDeadline',
      emailData: {
        taskTitle: task.title,
        projectName: project?.name || 'Unknown Project',
        dueDate: 'Today',
        daysLeft: 0,
        link: `/tasks/${task.id}`,
      },
    });
  }
}

// 5. Deadline Alert
async function handleDeadlineAlert() {
  const now = new Date();

  // Tasks due in exactly 4 days
  const fourDays = new Date();
  fourDays.setDate(now.getDate() + 4);
  const fourDaysStart = new Date(fourDays).setHours(0, 0, 0, 0);
  const fourDaysEnd = new Date(fourDays).setHours(23, 59, 59, 999);

  const tasksDue4Days = await db
    .select()
    .from(tasks)
    .where(
      and(
        gte(tasks.dueDate, new Date(fourDaysStart)),
        lte(tasks.dueDate, new Date(fourDaysEnd)),
        ne(tasks.status, 'done')
      )
    );

  // Tasks due in exactly 1 day
  const oneDay = new Date();
  oneDay.setDate(now.getDate() + 1);
  const oneDayStart = new Date(oneDay).setHours(0, 0, 0, 0);
  const oneDayEnd = new Date(oneDay).setHours(23, 59, 59, 999);

  const tasksDue1Day = await db
    .select()
    .from(tasks)
    .where(
      and(
        gte(tasks.dueDate, new Date(oneDayStart)),
        lte(tasks.dueDate, new Date(oneDayEnd)),
        ne(tasks.status, 'done')
      )
    );

  // Process 4-day alerts
  for (const task of tasksDue4Days) {
    if (!task.assigneeId) continue;
    const project = await db.select().from(projects).where(eq(projects.id, task.projectId)).limit(1).then(res => res[0]);

    await NotificationService.dispatch({
      event: 'task.deadline',
      userId: task.assigneeId,
      entityType: 'task',
      entityId: task.id,
      title: `Task Due in 4 Days: ${task.title}`,
      message: `Your task "${task.title}" is due in 4 days.`,
      emailTemplate: 'taskDeadline',
      emailData: {
        taskTitle: task.title,
        projectName: project?.name || 'Unknown Project',
        dueDate: task.dueDate?.toLocaleDateString() || '',
        daysLeft: 4,
        link: `/tasks/${task.id}`,
      },
    });
  }

  // Process 1-day alerts
  for (const task of tasksDue1Day) {
    if (!task.assigneeId) continue;
    const project = await db.select().from(projects).where(eq(projects.id, task.projectId)).limit(1).then(res => res[0]);

    await NotificationService.dispatch({
      event: 'task.deadline',
      userId: task.assigneeId,
      entityType: 'task',
      entityId: task.id,
      title: `Task Due Tomorrow: ${task.title}`,
      message: `Urgent: your task "${task.title}" is due tomorrow.`,
      emailTemplate: 'taskDeadline',
      emailData: {
        taskTitle: task.title,
        projectName: project?.name || 'Unknown Project',
        dueDate: task.dueDate?.toLocaleDateString() || '',
        daysLeft: 1,
        link: `/tasks/${task.id}`,
      },
    });
  }
}

// 6. Attendance Reminder
async function handleAttendanceReminder() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  // Find all employees
  const employees = await db.select().from(users).where(eq(users.role, 'employee'));

  for (const emp of employees) {
    // Check if they checked in today
    const record = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.userId, emp.id), eq(attendance.date, dateStr)))
      .limit(1)
      .then((res) => res[0]);

    if (!record || !record.checkIn) {
      await NotificationService.dispatch({
        event: 'attendance.reminder',
        userId: emp.id,
        title: 'Check-In Reminder',
        message: 'You have not checked in for your shift today. Please check in.',
        emailTemplate: 'attendanceReminder',
        emailData: {
          date: dateStr,
          shiftType: emp.shiftType || 'morning',
        },
      });
    }
  }
}

// 7. Birthday Wishes
async function handleBirthdayWishes() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const bdayUsers = await db
    .select()
    .from(users)
    .where(
      sql`EXTRACT(MONTH FROM ${users.dateOfBirth}) = ${month} AND EXTRACT(DAY FROM ${users.dateOfBirth}) = ${day}`
    );

  for (const user of bdayUsers) {
    await NotificationService.dispatch({
      event: 'birthdayWish',
      userId: user.id,
      title: `Happy Birthday, ${user.name}! 🎂`,
      message: 'Wishing you a very happy birthday from TaskForge AI!',
      emailTemplate: 'birthdayWish',
      emailData: {},
    });
  }
}

// 8. Project Anniversary
async function handleProjectAnniversary() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const anniversaryProjects = await db
    .select()
    .from(projects)
    .where(
      sql`EXTRACT(MONTH FROM ${projects.createdAt}) = ${month} AND EXTRACT(DAY FROM ${projects.createdAt}) = ${day} AND EXTRACT(YEAR FROM ${projects.createdAt}) < ${today.getFullYear()}`
    );

  for (const proj of anniversaryProjects) {
    const years = today.getFullYear() - new Date(proj.createdAt).getFullYear();

    // Get project members
    const members = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, proj.id));

    for (const mem of members) {
      await NotificationService.dispatch({
        event: 'project.anniversary',
        userId: mem.userId,
        entityType: 'project',
        entityId: proj.id,
        title: `Project Anniversary: ${proj.name}`,
        message: `Today marks ${years} years since "${proj.name}" was started. Happy anniversary!`,
        emailTemplate: 'projectAnniversary',
        emailData: {
          projectName: proj.name,
          years,
          link: `/projects/${proj.id}`,
        },
      });
    }
  }
}

// 9. Leave Expiry Reminder
async function handleLeaveExpiryReminder() {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const startOfDay = new Date(threeDaysFromNow).setHours(0, 0, 0, 0);
  const endOfDay = new Date(threeDaysFromNow).setHours(23, 59, 59, 999);

  // Leave ending in 3 days
  const expiringLeaves = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        gte(leaveRequests.endDate, new Date(startOfDay)),
        lte(leaveRequests.endDate, new Date(endOfDay)),
        eq(leaveRequests.status, 'approved')
      )
    );

  for (const leave of expiringLeaves) {
    const approvedByUser = leave.approvedById
      ? await db.select().from(users).where(eq(users.id, leave.approvedById)).limit(1).then(res => res[0])
      : null;

    await NotificationService.dispatch({
      event: 'leave.approved',
      userId: leave.userId,
      entityType: 'leave',
      entityId: leave.id,
      title: 'Leave Ending in 3 Days',
      message: `Your approved leave is scheduled to end on ${leave.endDate.toLocaleDateString()}.`,
      emailTemplate: 'leaveApproved',
      emailData: {
        leaveType: leave.leaveType,
        startDate: leave.startDate.toLocaleDateString(),
        endDate: leave.endDate.toLocaleDateString(),
        approvedBy: approvedByUser?.name || 'Manager',
        link: '/leaves',
      },
    });
  }
}

// 10. Workspace Inactivity Reminder
async function handleWorkspaceReminder() {
  const activeWorkspaces = await db.select().from(workspaces).where(eq(workspaces.status, 'active'));
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  for (const ws of activeWorkspaces) {
    if (!ws.ownerId) continue;

    // Check if there was any task update in last 14 days
    const wsProjects = await db.select().from(projects).where(eq(projects.workspaceId, ws.id));
    const projectIds = wsProjects.map((p) => p.id);

    let hasActivity = false;
    if (projectIds.length > 0) {
      const recentTasks = await db
        .select()
        .from(tasks)
        .where(sql`${tasks.projectId} IN ${projectIds} AND ${tasks.updatedAt} >= ${fourteenDaysAgo}`)
        .limit(1);

      if (recentTasks.length > 0) {
        hasActivity = true;
      }
    }

    if (!hasActivity) {
      await NotificationService.dispatch({
        event: 'workspace.reminder',
        userId: ws.ownerId,
        workspaceId: ws.id,
        title: `Workspace Inactivity Alert: ${ws.name}`,
        message: `Your workspace "${ws.name}" has had no updates in the last 14 days.`,
        emailTemplate: 'workspaceReminder',
        emailData: {
          workspaceName: ws.name,
          inactiveDays: 14,
          link: `/workspaces/${ws.id}`,
        },
      });
    }
  }
}
