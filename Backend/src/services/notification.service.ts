import { db } from '../db';
import { notifications, emailLogs, notificationPreferences, activityLogs, users } from '../db/schema';
import { mailQueue } from '../lib/queue';
import { socketService } from './socket.service';
import { EmailTemplates } from '../emails/templates';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger';

export interface NotificationDispatchPayload {
  event: string; // e.g. 'task.assigned', 'leave.approved', etc.
  userId: number;
  workspaceId?: number | null;
  entityType?: string;
  entityId?: number;
  title: string;
  message: string;
  link?: string;
  emailData?: Record<string, any>;
  emailTemplate?: string; // method name in EmailTemplates class
  skipEmail?: boolean;
  skipSocket?: boolean;
}

export class NotificationService {
  private static getPreferenceField(event: string): string | null {
    switch (event) {
      case 'task.assigned':
        return 'taskAssign';
      case 'task.deadline':
        return 'taskDeadline';
      case 'task.comment':
        return 'taskComment';
      case 'leave.request':
      case 'leave.approved':
      case 'leave.rejected':
        return 'leaveApproval';
      case 'attendance.reminder':
      case 'attendance.report':
        return 'attendanceAlert';
      case 'project.created':
      case 'project.assigned':
      case 'project.anniversary':
      case 'workspace.created':
      case 'workspace.joinRequest':
      case 'workspace.approval':
      case 'workspace.rejection':
      case 'workspace.reminder':
        return 'projectUpdate';
      case 'dailySummary':
      case 'weeklyReport':
        return 'weeklyDigest';
      case 'monthlyReport':
        return 'monthlyReport';
      case 'birthdayWish':
        return 'birthdayWish';
      default:
        return null;
    }
  }

  static async dispatch(payload: NotificationDispatchPayload): Promise<void> {
    const {
      event,
      userId,
      workspaceId,
      entityType,
      entityId,
      title,
      message,
      link,
      emailData,
      emailTemplate,
      skipEmail = false,
      skipSocket = false,
    } = payload;

    try {
      // 1. Fetch or create notification preferences
      let prefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1)
        .then((res) => res[0]);

      if (!prefs) {
        [prefs] = await db
          .insert(notificationPreferences)
          .values({
            userId,
            emailEnabled: true,
            pushEnabled: true,
            reminderEnabled: true,
            taskAssign: true,
            taskDeadline: true,
            taskComment: true,
            leaveApproval: true,
            attendanceAlert: true,
            projectUpdate: true,
            weeklyDigest: true,
            monthlyReport: true,
            birthdayWish: true,
          })
          .returning();
      }

      // Check toggles based on the event
      const prefField = this.getPreferenceField(event);
      const isEmailAllowed = prefs.emailEnabled && (prefField === null || (prefs as any)[prefField] !== false);
      const isPushAllowed = prefs.pushEnabled && (prefField === null || (prefs as any)[prefField] !== false);

      // 2. Save Notification to Database
      const [insertedNotif] = await db
        .insert(notifications)
        .values({
          userId,
          title,
          message,
          type: event,
          isRead: false,
          isArchived: false,
          link: link || null,
          entityType: entityType || null,
          entityId: entityId || null,
          actionType: event,
          createdAt: new Date(),
        })
        .returning();

      // 3. Emit real-time Socket.IO notification if allowed
      if (isPushAllowed && !skipSocket) {
        socketService.emitToUser(userId, 'notification', insertedNotif);
      }

      // 4. Queue Email if allowed
      if (isEmailAllowed && !skipEmail && emailTemplate) {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
          .then((res) => res[0]);

        if (user && user.email) {
          const userName = user.name || 'User';
          const data = emailData || {};
          let html = '';

          switch (emailTemplate) {
            case 'taskAssigned':
              html = EmailTemplates.taskAssigned(userName, data.taskTitle, data.projectName, data.priority, data.estimatedHours, data.link);
              break;
            case 'taskDeadline':
              html = EmailTemplates.taskDeadline(userName, data.taskTitle, data.projectName, data.dueDate, data.daysLeft, data.link);
              break;
            case 'taskCompleted':
              html = EmailTemplates.taskCompleted(userName, data.taskTitle, data.projectName, data.completedByName, data.link);
              break;
            case 'taskComment':
              html = EmailTemplates.taskComment(userName, data.taskTitle, data.commentText, data.authorName, data.link);
              break;
            case 'projectCreated':
              html = EmailTemplates.projectCreated(userName, data.projectName, data.workspaceName, data.description, data.link);
              break;
            case 'projectManagerAssigned':
              html = EmailTemplates.projectManagerAssigned(userName, data.projectName, data.link);
              break;
            case 'projectAssignment':
              html = EmailTemplates.projectAssignment(userName, data.projectName, data.link);
              break;
            case 'projectAnniversary':
              html = EmailTemplates.projectAnniversary(userName, data.projectName, data.years, data.link);
              break;
            case 'leaveRequest':
              html = EmailTemplates.leaveRequest(userName, data.employeeName, data.leaveType, data.startDate, data.endDate, data.reason, data.link);
              break;
            case 'leaveApproved':
              html = EmailTemplates.leaveApproved(userName, data.leaveType, data.startDate, data.endDate, data.approvedBy, data.link);
              break;
            case 'leaveRejected':
              html = EmailTemplates.leaveRejected(userName, data.leaveType, data.startDate, data.endDate, data.rejectedBy, data.reason, data.link);
              break;
            case 'attendanceReminder':
              html = EmailTemplates.attendanceReminder(userName, data.date, data.shiftType);
              break;
            case 'attendanceReport':
              html = EmailTemplates.attendanceReport(userName, data.date, data.presentCount, data.lateCount, data.absentCount, data.detailsHtml);
              break;
            case 'dailySummary':
              html = EmailTemplates.dailySummary(userName, data.activeTasksHtml, data.overdueTasksHtml);
              break;
            case 'weeklyReport':
              html = EmailTemplates.weeklyReport(userName, data.workspaceName, data.completedCount, data.createdCount, data.openCount, data.detailsHtml);
              break;
            case 'monthlyReport':
              html = EmailTemplates.monthlyReport(userName, data.workspaceName, data.completedCount, data.createdCount, data.activeCount, data.detailsHtml);
              break;
            case 'birthdayWish':
              html = EmailTemplates.birthdayWish(userName);
              break;
            case 'workspaceInvite':
              html = EmailTemplates.workspaceInvite(data.workspaceName, data.inviteLink);
              break;
            case 'workspaceReminder':
              html = EmailTemplates.workspaceReminder(userName, data.workspaceName, data.inactiveDays, data.link);
              break;
            case 'workspaceCreated':
              html = EmailTemplates.workspaceCreated(userName, data.workspaceName, data.link, data.inviteCode, data.inviteLink);
              break;
            case 'workspaceJoinRequest':
              html = EmailTemplates.workspaceJoinRequest(userName, data.requesterName, data.requesterEmail, data.workspaceName, data.link);
              break;
            case 'workspaceApproval':
              html = EmailTemplates.workspaceApproval(userName, data.workspaceName, data.link);
              break;
            case 'workspaceRejection':
              html = EmailTemplates.workspaceRejection(userName, data.workspaceName);
              break;
          }

          if (html) {
            // Log to emailLogs
            const [emailLog] = await db
              .insert(emailLogs)
              .values({
                workspaceId: workspaceId || null,
                recipient: user.email,
                subject: title,
                eventType: event,
                status: 'queued',
                userId: userId,
                htmlContent: html,
                createdAt: new Date(),
              })
              .returning();

            // Enqueue BullMQ job
            await mailQueue.add('send-email', {
              emailLogId: emailLog.id,
              to: user.email,
              subject: title,
              html,
            });
            
            logger.info(`Queued email dispatch to ${user.email} for event ${event}`);
          }
        }
      }

      // 5. Save Activity Log
      await db.insert(activityLogs).values({
        workspaceId: workspaceId || null,
        userId,
        action: title,
        entityType: entityType || null,
        entityId: entityId || null,
        details: message,
        createdAt: new Date(),
      });

      logger.info(`Successfully dispatched notification for event ${event} to user ${userId}`);
    } catch (err: any) {
      logger.error(`Failed to dispatch notification for event ${event}: ${err.message || err}`);
    }
  }
}
