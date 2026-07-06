import type { Request, Response } from 'express';
import { notificationRepository } from '../repositories/notification.repository';
import { db } from '../db';
import { notificationPreferences, emailLogs, automationLogs, notifications } from '../db/schema';
import { eq, and, desc, count, or, ilike } from 'drizzle-orm';
import { sendMail } from '../lib/send-email';
import { logger } from '../lib/logger';

export class NotificationController {
  // 1. Get notifications for user
  static async getNotifications(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
      const search = req.query.search as string;
      const type = req.query.type as string;

      let isRead: boolean | undefined;
      if (req.query.isRead === 'true') isRead = true;
      if (req.query.isRead === 'false') isRead = false;

      let isArchived: boolean | undefined = false; // default to not showing archived
      if (req.query.isArchived === 'true') isArchived = true;
      if (req.query.isArchived === 'all') isArchived = undefined;

      const result = await notificationRepository.findByUser(user.id, {
        page,
        limit,
        isRead,
        isArchived,
        type,
        search,
      });

      const unreadCount = await notificationRepository.countUnread(user.id);

      return res.status(200).json({
        ...result,
        unreadCount,
      });
    } catch (err: any) {
      logger.error('Error fetching notifications:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 2. Mark specific notification as read
  static async markAsRead(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const notif = await notificationRepository.findById(id);
      if (!notif) return res.status(404).json({ message: 'Notification not found' });
      if (notif.userId !== user.id) return res.status(403).json({ message: 'Forbidden' });

      const updated = await notificationRepository.update(id, { isRead: true });
      return res.status(200).json(updated);
    } catch (err: any) {
      logger.error('Error marking notification as read:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 3. Mark all as read
  static async markAllRead(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      await notificationRepository.markAllRead(user.id);
      return res.status(200).json({ message: 'All notifications marked as read' });
    } catch (err: any) {
      logger.error('Error marking all notifications as read:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 4. Archive specific notification
  static async archiveNotification(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const notif = await notificationRepository.findById(id);
      if (!notif) return res.status(404).json({ message: 'Notification not found' });
      if (notif.userId !== user.id) return res.status(403).json({ message: 'Forbidden' });

      const updated = await notificationRepository.update(id, { isArchived: true });
      return res.status(200).json(updated);
    } catch (err: any) {
      logger.error('Error archiving notification:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 5. Delete specific notification
  static async deleteNotification(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const notif = await notificationRepository.findById(id);
      if (!notif) return res.status(404).json({ message: 'Notification not found' });
      if (notif.userId !== user.id) return res.status(403).json({ message: 'Forbidden' });

      await notificationRepository.delete(id, false); // hard delete
      return res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (err: any) {
      logger.error('Error deleting notification:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 6. Clear all notifications (hard delete)
  static async clearAll(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      await db.delete(notifications).where(eq(notifications.userId, user.id));
      return res.status(200).json({ message: 'All notifications cleared' });
    } catch (err: any) {
      logger.error('Error clearing notifications:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 7. Get notification preferences
  static async getPreferences(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      let prefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, user.id))
        .limit(1)
        .then((res) => res[0]);

      if (!prefs) {
        [prefs] = await db
          .insert(notificationPreferences)
          .values({
            userId: user.id,
          })
          .returning();
      }

      return res.status(200).json(prefs);
    } catch (err: any) {
      logger.error('Error getting preferences:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 8. Update notification preferences
  static async updatePreferences(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      // Clean payload: remove id and userId to prevent tampering
      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.userId;

      const [updated] = await db
        .insert(notificationPreferences)
        .values({
          userId: user.id,
          ...updateData,
        })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: updateData,
        })
        .returning();

      return res.status(200).json(updated);
    } catch (err: any) {
      logger.error('Error updating preferences:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 9. Get Email Logs (Admin only)
  static async getEmailLogs(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const conditions = [];
      if (status) {
        conditions.push(eq(emailLogs.status, status));
      }
      if (search) {
        conditions.push(
          or(
            ilike(emailLogs.recipient, `%${search}%`),
            ilike(emailLogs.subject, `%${search}%`),
            ilike(emailLogs.eventType, `%${search}%`)
          )
        );
      }

      const data = await db
        .select()
        .from(emailLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(emailLogs.createdAt));

      const countResult = await db
        .select({ count: count() })
        .from(emailLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0] ? Number(countResult[0].count) : 0;

      return res.status(200).json({
        data,
        total,
        page,
        limit,
      });
    } catch (err: any) {
      logger.error('Error fetching email logs:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 10. Retry Email Send (Admin only)
  static async retryEmailLog(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const log = await db
        .select()
        .from(emailLogs)
        .where(eq(emailLogs.id, id))
        .limit(1)
        .then((res) => res[0]);

      if (!log) return res.status(404).json({ message: 'Email log not found' });
      if (!log.htmlContent) return res.status(400).json({ message: 'No HTML content found to retry' });

      // Update log state
      await db
        .update(emailLogs)
        .set({
          status: 'sending',
          errorMessage: null,
        })
        .where(eq(emailLogs.id, id));

      try {
        const result = await sendMail(log.recipient, log.subject, log.htmlContent);
        await db.update(emailLogs)
          .set({
            status: 'sent',
            messageId: result.messageId || null,
            sentAt: new Date(),
            errorMessage: null,
          })
          .where(eq(emailLogs.id, id));
        return res.status(200).json({ message: 'Email retried successfully' });
      } catch (sendError: any) {
        await db.update(emailLogs)
          .set({
            status: 'failed',
            errorMessage: sendError?.error || sendError?.message || String(sendError),
          })
          .where(eq(emailLogs.id, id));
        logger.error('Error retrying email log:', sendError);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
    } catch (err: any) {
      logger.error('Error retrying email log:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 11. Get Automation Logs (Admin only)
  static async getAutomationLogs(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
      const offset = (page - 1) * limit;
      const jobType = req.query.jobType as string;
      const status = req.query.status as string;

      const conditions = [];
      if (status) {
        conditions.push(eq(automationLogs.status, status));
      }
      if (jobType) {
        conditions.push(eq(automationLogs.jobType, jobType));
      }

      const data = await db
        .select()
        .from(automationLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(automationLogs.ranAt));

      const countResult = await db
        .select({ count: count() })
        .from(automationLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0] ? Number(countResult[0].count) : 0;

      return res.status(200).json({
        data,
        total,
        page,
        limit,
      });
    } catch (err: any) {
      logger.error('Error fetching automation logs:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
