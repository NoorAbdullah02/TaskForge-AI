import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { TimesheetService, MANAGER_ROLES } from '../services/timesheet.service';
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
    res.status(403).json({ message: 'Manager access required to review timesheets' });
    return null;
  }
  return { id: user.id, workspaceId: user.activeWorkspaceId };
}

export class TimesheetController {
  // 1. Generate/refresh a timesheet for a period (daily/weekly/monthly) anchored on a date
  static async generate(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      if (!user.activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

      const { periodType, periodStart } = req.body;
      const sheet = await TimesheetService.generate(user.activeWorkspaceId, user.id, periodType, periodStart);
      return res.status(200).json(sheet);
    } catch (error: any) {
      logger.error(`TimesheetController.generate error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to generate timesheet' });
    }
  }

  // 2. List my own timesheets
  static async listMine(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      if (!user.activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

      const { periodType, status } = req.query;
      const sheets = await TimesheetService.listMine(user.activeWorkspaceId, user.id, {
        periodType: periodType as string | undefined,
        status: status as string | undefined,
      });
      return res.status(200).json(sheets);
    } catch (error) {
      logger.error(`TimesheetController.listMine error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 3. Manager: list team timesheets
  static async listTeam(req: Request, res: Response) {
    const ctx = requireManager(req, res);
    if (!ctx) return;
    try {
      const { periodType, status, userId } = req.query;
      const sheets = await TimesheetService.listTeam(ctx.workspaceId, {
        periodType: periodType as string | undefined,
        status: status as string | undefined,
        userId: userId ? parseInt(userId as string, 10) : undefined,
      });
      return res.status(200).json(sheets);
    } catch (error) {
      logger.error(`TimesheetController.listTeam error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 4. Get one timesheet + daily breakdown (owner of sheet or a manager)
  static async getOne(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      if (!user.activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

      const id = parseInt(req.params.id, 10);
      const sheet = await TimesheetService.getById(id, user.activeWorkspaceId);
      if (!sheet) return res.status(404).json({ message: 'Timesheet not found' });
      if (sheet.userId !== user.id && !MANAGER_ROLES.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const breakdown = await TimesheetService.getBreakdown(sheet);
      return res.status(200).json({ ...sheet, ...breakdown });
    } catch (error) {
      logger.error(`TimesheetController.getOne error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 5. Submit a draft/rejected timesheet for manager review
  static async submit(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      if (!user.activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

      const id = parseInt(req.params.id, 10);
      const sheet = await TimesheetService.submit(id, user.activeWorkspaceId, user.id);
      return res.status(200).json(sheet);
    } catch (error: any) {
      logger.error(`TimesheetController.submit error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to submit timesheet' });
    }
  }

  // 6. Manager: approve + lock a timesheet
  static async approve(req: Request, res: Response) {
    const ctx = requireManager(req, res);
    if (!ctx) return;
    try {
      const id = parseInt(req.params.id, 10);
      const sheet = await TimesheetService.approve(id, ctx.workspaceId, ctx.id, req.body?.note);
      return res.status(200).json(sheet);
    } catch (error: any) {
      logger.error(`TimesheetController.approve error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to approve timesheet' });
    }
  }

  // 7. Manager: reject a timesheet (unlocked, sent back to employee)
  static async reject(req: Request, res: Response) {
    const ctx = requireManager(req, res);
    if (!ctx) return;
    try {
      const id = parseInt(req.params.id, 10);
      const sheet = await TimesheetService.reject(id, ctx.workspaceId, ctx.id, req.body?.note);
      return res.status(200).json(sheet);
    } catch (error: any) {
      logger.error(`TimesheetController.reject error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to reject timesheet' });
    }
  }

  // 8. Manager: manually lock/unlock a timesheet
  static async setLock(req: Request, res: Response) {
    const ctx = requireManager(req, res);
    if (!ctx) return;
    try {
      const id = parseInt(req.params.id, 10);
      const isLocked = !!req.body?.isLocked;
      const sheet = await TimesheetService.setLock(id, ctx.workspaceId, isLocked);
      return res.status(200).json(sheet);
    } catch (error: any) {
      logger.error(`TimesheetController.setLock error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to update lock state' });
    }
  }

  // 9. Export a timesheet as a PDF
  static async downloadPdf(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      if (!user.activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

      const id = parseInt(req.params.id, 10);
      const sheet = await TimesheetService.getById(id, user.activeWorkspaceId);
      if (!sheet) return res.status(404).json({ message: 'Timesheet not found' });
      if (sheet.userId !== user.id && !MANAGER_ROLES.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { timeEntries, workLogEntries } = await TimesheetService.getBreakdown(sheet);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="timesheet-${sheet.periodStart}-${sheet.periodEnd}.pdf"`);

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      doc.fontSize(20).text('TaskForge AI', { align: 'left' });
      doc.moveDown();
      doc.fontSize(16).text(`Timesheet: ${sheet.periodType.toUpperCase()}`, { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(`Period: ${sheet.periodStart} - ${sheet.periodEnd}`);
      doc.text(`Status: ${sheet.status}${sheet.isLocked ? ' (locked)' : ''}`);
      doc.text(`Total Hours: ${sheet.totalHours}`);
      doc.text(`Work Log Entries: ${sheet.workLogCount}`);
      doc.moveDown();

      doc.fontSize(13).text('Time Entries', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      if (timeEntries.length === 0) {
        doc.text('No time entries for this period.');
      } else {
        for (const t of timeEntries) {
          const hours = t.duration ? Math.round((t.duration / 3600) * 100) / 100 : 0;
          doc.text(`${new Date(t.startTime).toLocaleString()} — ${t.taskTitle || 'No task'} — ${hours}h — ${t.description || ''}`);
        }
      }
      doc.moveDown();

      doc.fontSize(13).text('Daily Work Logs', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      if (workLogEntries.length === 0) {
        doc.text('No work logs for this period.');
      } else {
        for (const l of workLogEntries) {
          doc.text(`${l.logDate} — ${l.title} — ${l.hoursWorked}h — ${l.progressPercent}% — ${l.status}`);
        }
      }

      doc.moveDown();
      doc.fontSize(9).text('Generated by TaskForge AI', { align: 'center' });
      doc.end();
    } catch (error) {
      logger.error(`TimesheetController.downloadPdf error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  // 10. Export a timesheet as an Excel workbook
  static async downloadExcel(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      if (!user.activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

      const id = parseInt(req.params.id, 10);
      const sheet = await TimesheetService.getById(id, user.activeWorkspaceId);
      if (!sheet) return res.status(404).json({ message: 'Timesheet not found' });
      if (sheet.userId !== user.id && !MANAGER_ROLES.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { timeEntries, workLogEntries } = await TimesheetService.getBreakdown(sheet);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'TaskForge AI';
      workbook.created = sheet.createdAt;

      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [{ header: 'Field', key: 'field', width: 25 }, { header: 'Value', key: 'value', width: 40 }];
      summarySheet.addRows([
        { field: 'Period Type', value: sheet.periodType },
        { field: 'Period Start', value: sheet.periodStart },
        { field: 'Period End', value: sheet.periodEnd },
        { field: 'Status', value: sheet.status },
        { field: 'Locked', value: sheet.isLocked ? 'Yes' : 'No' },
        { field: 'Total Hours', value: sheet.totalHours },
        { field: 'Work Log Count', value: sheet.workLogCount },
      ]);
      summarySheet.getRow(1).font = { bold: true };

      const timeSheet = workbook.addWorksheet('Time Entries');
      timeSheet.columns = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Task', key: 'task', width: 30 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Hours', key: 'hours', width: 12 },
        { header: 'Status', key: 'status', width: 15 },
      ];
      timeSheet.getRow(1).font = { bold: true };
      for (const t of timeEntries) {
        timeSheet.addRow({
          date: new Date(t.startTime).toLocaleString(),
          task: t.taskTitle || 'No task',
          description: t.description || '',
          hours: t.duration ? Math.round((t.duration / 3600) * 100) / 100 : 0,
          status: t.status,
        });
      }

      const logSheet = workbook.addWorksheet('Daily Work Logs');
      logSheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Project', key: 'project', width: 20 },
        { header: 'Hours', key: 'hours', width: 12 },
        { header: 'Progress %', key: 'progress', width: 12 },
        { header: 'Status', key: 'status', width: 18 },
      ];
      logSheet.getRow(1).font = { bold: true };
      for (const l of workLogEntries) {
        logSheet.addRow({
          date: l.logDate,
          title: l.title,
          project: l.projectName || '-',
          hours: l.hoursWorked,
          progress: l.progressPercent,
          status: l.status,
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="timesheet-${sheet.periodStart}-${sheet.periodEnd}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      logger.error(`TimesheetController.downloadExcel error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
