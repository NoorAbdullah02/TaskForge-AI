import { Request, Response } from 'express';
import { db } from '../db';
import { workLogs } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { WorkLogService, MANAGER_ROLES } from '../services/workLog.service';
import { logger } from '../lib/logger';

function requireManager(req: Request, res: Response): { id: number; workspaceId: number } | null {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
  if (!user.activeWorkspaceId) {
    res.status(400).json({ message: 'No active workspace selected' });
    return null;
  }
  if (!MANAGER_ROLES.includes(user.role)) {
    res.status(403).json({ message: 'Manager access required to review work logs' });
    return null;
  }
  return { id: user.id, workspaceId: user.activeWorkspaceId };
}

export class WorkLogController {
  // 1. Submit a new daily work log
  static async submit(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      if (!user.activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

      const log = await WorkLogService.submitWorkLog(user.activeWorkspaceId, user.id, req.body);
      return res.status(201).json(log);
    } catch (error: any) {
      logger.error(`WorkLogController.submit error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to submit work log' });
    }
  }

  // 2. Update a pending/rejected/changes_requested work log (own log only)
  static async update(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      if (!user.activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

      const workLogId = parseInt(req.params.id, 10);
      const log = await WorkLogService.updateWorkLog(workLogId, user.activeWorkspaceId, user.id, req.body);
      return res.status(200).json(log);
    } catch (error: any) {
      logger.error(`WorkLogController.update error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to update work log' });
    }
  }

  // 3. List my own work logs (with optional date range/status filters)
  static async listMine(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      if (!user.activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

      const { from, to, status } = req.query;
      const logs = await WorkLogService.listMine(user.activeWorkspaceId, user.id, {
        from: from as string | undefined,
        to: to as string | undefined,
        status: status as string | undefined,
      });
      return res.status(200).json(logs);
    } catch (error) {
      logger.error(`WorkLogController.listMine error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 4. Get a single work log with attachments (owner of log or a manager)
  static async getOne(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      const workLogId = parseInt(req.params.id, 10);
      const log = await WorkLogService.getWorkLogWithAttachments(workLogId, user.activeWorkspaceId);
      if (!log) {
        return res.status(404).json({ message: 'Work log not found' });
      }
      if (log.userId !== user.id && !MANAGER_ROLES.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return res.status(200).json(log);
    } catch (error) {
      logger.error(`WorkLogController.getOne error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 5. Manager: list team work logs pending/all review, with filters
  static async listTeam(req: Request, res: Response) {
    const ctx = requireManager(req, res);
    if (!ctx) return;
    try {
      const { from, to, status, userId } = req.query;
      const logs = await WorkLogService.listTeam(ctx.workspaceId, {
        from: from as string | undefined,
        to: to as string | undefined,
        status: status as string | undefined,
        userId: userId ? parseInt(userId as string, 10) : undefined,
      });
      return res.status(200).json(logs);
    } catch (error) {
      logger.error(`WorkLogController.listTeam error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 6. Manager: approve a work log
  static async approve(req: Request, res: Response) {
    const ctx = requireManager(req, res);
    if (!ctx) return;
    try {
      const workLogId = parseInt(req.params.id, 10);
      const updated = await WorkLogService.approve(workLogId, ctx.workspaceId, ctx.id, req.body?.note);
      return res.status(200).json(updated);
    } catch (error: any) {
      logger.error(`WorkLogController.approve error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to approve work log' });
    }
  }

  // 7. Manager: reject a work log
  static async reject(req: Request, res: Response) {
    const ctx = requireManager(req, res);
    if (!ctx) return;
    try {
      const workLogId = parseInt(req.params.id, 10);
      const updated = await WorkLogService.reject(workLogId, ctx.workspaceId, ctx.id, req.body?.note, false);
      return res.status(200).json(updated);
    } catch (error: any) {
      logger.error(`WorkLogController.reject error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to reject work log' });
    }
  }

  // 8. Manager: request changes on a work log
  static async requestChanges(req: Request, res: Response) {
    const ctx = requireManager(req, res);
    if (!ctx) return;
    try {
      const workLogId = parseInt(req.params.id, 10);
      const updated = await WorkLogService.reject(workLogId, ctx.workspaceId, ctx.id, req.body?.note, true);
      return res.status(200).json(updated);
    } catch (error: any) {
      logger.error(`WorkLogController.requestChanges error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to request changes on work log' });
    }
  }

  // 9. Manager: bulk approve multiple work logs
  static async bulkApprove(req: Request, res: Response) {
    const ctx = requireManager(req, res);
    if (!ctx) return;
    try {
      const { workLogIds } = req.body;
      const { succeeded, failed } = await WorkLogService.bulkApprove(workLogIds, ctx.workspaceId, ctx.id);
      return res.status(200).json({ approved: succeeded.length, results: succeeded, failed });
    } catch (error) {
      logger.error(`WorkLogController.bulkApprove error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 10. Analytics: work-log summary counts + hours for owner reporting
  static async getAnalytics(req: Request, res: Response) {
    const ctx = requireManager(req, res);
    if (!ctx) return;
    try {
      const { from, to } = req.query;
      const conditions = [eq(workLogs.workspaceId, ctx.workspaceId)];
      if (from) conditions.push(gte(workLogs.logDate, from as string));
      if (to) conditions.push(lte(workLogs.logDate, to as string));

      const [summary] = await db.select({
        totalLogs: sql<number>`count(*)::int`,
        pendingCount: sql<number>`count(*) filter (where ${workLogs.status} = 'pending')::int`,
        approvedCount: sql<number>`count(*) filter (where ${workLogs.status} = 'approved')::int`,
        rejectedCount: sql<number>`count(*) filter (where ${workLogs.status} = 'rejected')::int`,
        changesRequestedCount: sql<number>`count(*) filter (where ${workLogs.status} = 'changes_requested')::int`,
        totalHours: sql<number>`coalesce(sum(${workLogs.hoursWorked}), 0)::float`,
        avgProgress: sql<number>`coalesce(avg(${workLogs.progressPercent}), 0)::float`,
      }).from(workLogs).where(and(...conditions));

      return res.status(200).json(summary);
    } catch (error) {
      logger.error(`WorkLogController.getAnalytics error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
