import { Request, Response } from 'express';
import { db } from '../db';
import { workspaces, invoices, billingHistory, payments } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { SubscriptionService } from '../services/subscription.service';
import { PaymentService } from '../services/payment.service';
import { PLAN_LIMITS, PLAN_PRICING, getYearlySavingsPercent, TRIAL_DAYS } from '../config/plans';
import { env } from '../config/env';
import PDFDocument from 'pdfkit';
import { logger } from '../lib/logger';

const BRAND = '#2563eb';
const BRAND_DARK = '#1e3a8a';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const SURFACE = '#f8fafc';
const SUCCESS = '#16a34a';

function money(cents: number): string {
  return `${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT`;
}

function titleCase(s: string): string {
  return s.replace(/(^|[\s_-])\S/g, (c) => c.toUpperCase()).replace(/[_-]/g, ' ');
}

function renderInvoicePdf(
  doc: PDFKit.PDFDocument,
  data: {
    invoice: typeof invoices.$inferSelect;
    workspace: typeof workspaces.$inferSelect | undefined;
    payment: typeof payments.$inferSelect | undefined;
  },
) {
  const { invoice, workspace, payment } = data;
  const pageWidth = doc.page.width;
  const marginX = 50;
  const contentWidth = pageWidth - marginX * 2;

  // --- Header band ---
  const headerHeight = 150;
  doc.rect(0, 0, pageWidth, headerHeight).fill(BRAND);
  doc.rect(0, headerHeight - 6, pageWidth, 6).fill(BRAND_DARK);

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('TaskForge AI', marginX, 46);
  doc.font('Helvetica').fontSize(10).fillColor('#dbeafe').text('Project & Team Management, Simplified', marginX, 74);

  doc.font('Helvetica-Bold').fontSize(26).fillColor('#ffffff').text('INVOICE', marginX, 14, {
    width: contentWidth,
    align: 'right',
  });
  const invoiceNoY = 40;
  doc.font('Helvetica').fontSize(11).fillColor('#dbeafe').text(invoice.invoiceNumber, marginX, invoiceNoY, {
    width: contentWidth,
    align: 'right',
  });

  const statusLabel = 'PAID';
  doc.font('Helvetica-Bold').fontSize(10);
  const badgeText = ` ${statusLabel} `;
  const badgeWidth = doc.widthOfString(badgeText) + 14;
  const badgeX = pageWidth - marginX - badgeWidth;
  const badgeY = 70;
  doc.roundedRect(badgeX, badgeY, badgeWidth, 22, 11).fill('#ffffff');
  doc.fillColor(SUCCESS).text(badgeText, badgeX, badgeY + 6, { width: badgeWidth, align: 'center' });

  // --- Meta section: Billed To / Invoice Details ---
  let y = headerHeight + 36;
  const colWidth = contentWidth / 2 - 12;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(MUTED).text('BILLED TO', marginX, y);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(workspace?.name || 'Workspace', marginX, y + 16);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(workspace?.slug ? `Workspace ID: ${workspace.slug}` : '', marginX, y + 34);

  const rightColX = marginX + colWidth + 24;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(MUTED).text('INVOICE DETAILS', rightColX, y, { width: colWidth, align: 'right' });
  const detailRows: [string, string][] = [
    ['Issued On', new Date(invoice.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
    ['Billing Cycle', titleCase(invoice.billingCycle)],
  ];
  if (payment?.method) detailRows.push(['Payment Method', titleCase(payment.method)]);
  if (payment?.transactionId) detailRows.push(['Transaction ID', payment.transactionId]);

  let detailY = y + 16;
  for (const [label, value] of detailRows) {
    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(label, rightColX, detailY, { width: colWidth * 0.5, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(
      value,
      rightColX + colWidth * 0.5,
      detailY,
      { width: colWidth * 0.5, align: 'right' },
    );
    detailY += 16;
  }

  // --- Itemized table ---
  y = Math.max(y + 70, detailY + 16);
  const tableX = marginX;
  const tableWidth = contentWidth;
  const rowHeight = 32;

  doc.roundedRect(tableX, y, tableWidth, rowHeight, 4).fill(BRAND_DARK);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
  doc.text('DESCRIPTION', tableX + 14, y + 11, { width: tableWidth * 0.5 });
  doc.text('BILLING CYCLE', tableX + tableWidth * 0.5, y + 11, { width: tableWidth * 0.28, align: 'left' });
  doc.text('AMOUNT', tableX, y + 11, { width: tableWidth - 14, align: 'right' });

  y += rowHeight;
  const itemRowHeight = 42;
  doc.rect(tableX, y, tableWidth, itemRowHeight).fill(SURFACE);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(
    `${titleCase(invoice.plan)} Plan Subscription`,
    tableX + 14,
    y + 12,
    { width: tableWidth * 0.5 },
  );
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(
    titleCase(invoice.billingCycle),
    tableX + tableWidth * 0.5,
    y + 15,
    { width: tableWidth * 0.28 },
  );
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(
    money(invoice.amountCents),
    tableX,
    y + 15,
    { width: tableWidth - 14, align: 'right' },
  );

  y += itemRowHeight;
  doc.moveTo(tableX, y).lineTo(tableX + tableWidth, y).strokeColor(LINE).lineWidth(1).stroke();

  // --- Totals ---
  y += 20;
  const totalsWidth = 220;
  const totalsX = tableX + tableWidth - totalsWidth;

  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('Subtotal', totalsX, y, { width: totalsWidth * 0.5 });
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(money(invoice.amountCents), totalsX + totalsWidth * 0.5, y, {
    width: totalsWidth * 0.5,
    align: 'right',
  });

  y += 22;
  doc.roundedRect(totalsX, y, totalsWidth, 34, 4).fill(BRAND);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff').text('Total Paid', totalsX + 14, y + 11);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff').text(money(invoice.amountCents), totalsX, y + 10, {
    width: totalsWidth - 14,
    align: 'right',
  });

  // --- Footer ---
  const footerY = doc.page.height - 110;
  doc.moveTo(marginX, footerY).lineTo(pageWidth - marginX, footerY).strokeColor(LINE).lineWidth(1).stroke();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('Thank you for your business!', marginX, footerY + 16);
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(
    'This is a system-generated invoice from TaskForge AI. For questions about this invoice, please contact your workspace administrator.',
    marginX,
    footerY + 34,
    { width: contentWidth },
  );
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
    `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    marginX,
    footerY + 62,
    { width: contentWidth, align: 'left' },
  );
}

function requireOwner(req: Request, res: Response): { id: number; workspaceId: number } | null {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
  if (user.role !== 'owner' || !user.activeWorkspaceId) {
    res.status(403).json({ message: 'Forbidden: Workspace Owner access required' });
    return null;
  }
  return { id: user.id, workspaceId: user.activeWorkspaceId };
}

export class BillingController {
  static async getPlans(req: Request, res: Response) {
    try {
      return res.json({
        limits: PLAN_LIMITS,
        pricing: PLAN_PRICING,
        savings: {
          pro: getYearlySavingsPercent('pro'),
          enterprise: getYearlySavingsPercent('enterprise'),
        },
        trialDays: TRIAL_DAYS,
        merchantNumbers: {
          bkash: env.BKASH_MERCHANT_NUMBER,
          nagad: env.NAGAD_MERCHANT_NUMBER,
        },
      });
    } catch (error) {
      logger.error(`getPlans error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  static async getSubscription(req: Request, res: Response) {
    const ctx = requireOwner(req, res);
    if (!ctx) return;
    try {
      const subscription = await SubscriptionService.getSubscriptionForWorkspace(ctx.workspaceId);
      const trialRemainingDays = SubscriptionService.computeTrialRemainingDays(subscription);
      const isReadOnly = await SubscriptionService.isWorkspaceReadOnly(ctx.workspaceId);
      return res.json({ subscription, trialRemainingDays, isReadOnly });
    } catch (error) {
      logger.error(`getSubscription error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  static async submitPayment(req: Request, res: Response) {
    const ctx = requireOwner(req, res);
    if (!ctx) return;
    try {
      const { plan, billingCycle, method, transactionId, senderNumber, screenshotUrl } = req.body;
      const payment = await PaymentService.submitPayment({
        workspaceId: ctx.workspaceId,
        submittedByUserId: ctx.id,
        plan,
        billingCycle,
        method,
        transactionId,
        senderNumber,
        screenshotUrl,
      });
      return res.status(201).json(payment);
    } catch (error: any) {
      logger.error(`submitPayment error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to submit payment' });
    }
  }

  static async getPayments(req: Request, res: Response) {
    const ctx = requireOwner(req, res);
    if (!ctx) return;
    try {
      const { payments: paymentRows } = await PaymentService.listPayments({ workspaceId: ctx.workspaceId, page: 1, limit: 100 });
      return res.json(paymentRows);
    } catch (error) {
      logger.error(`getPayments error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  static async getBillingHistory(req: Request, res: Response) {
    const ctx = requireOwner(req, res);
    if (!ctx) return;
    try {
      const history = await db.select().from(billingHistory)
        .where(eq(billingHistory.workspaceId, ctx.workspaceId))
        .orderBy(desc(billingHistory.createdAt));
      return res.json(history);
    } catch (error) {
      logger.error(`getBillingHistory error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  static async getInvoices(req: Request, res: Response) {
    const ctx = requireOwner(req, res);
    if (!ctx) return;
    try {
      const rows = await db.select().from(invoices)
        .where(eq(invoices.workspaceId, ctx.workspaceId))
        .orderBy(desc(invoices.issuedAt));
      return res.json(rows);
    } catch (error) {
      logger.error(`getInvoices error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  static async cancelSubscription(req: Request, res: Response) {
    const ctx = requireOwner(req, res);
    if (!ctx) return;
    try {
      const subscription = await SubscriptionService.cancelSubscription(ctx.workspaceId, ctx.id);
      return res.json(subscription);
    } catch (error: any) {
      logger.error(`cancelSubscription error: ${error}`);
      return res.status(400).json({ message: error.message || 'Failed to cancel subscription' });
    }
  }

  static async downloadInvoicePdf(req: Request, res: Response) {
    const ctx = requireOwner(req, res);
    if (!ctx) return;
    try {
      const invoiceId = parseInt(req.params.id, 10);
      if (isNaN(invoiceId)) return res.status(400).json({ message: 'Invalid invoice ID' });

      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
      if (!invoice || invoice.workspaceId !== ctx.workspaceId) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, ctx.workspaceId)).limit(1);
      const [payment] = invoice.paymentId
        ? await db.select().from(payments).where(eq(payments.id, invoice.paymentId)).limit(1)
        : [undefined];

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);

      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      doc.pipe(res);
      renderInvoicePdf(doc, { invoice, workspace, payment });
      doc.end();
    } catch (error) {
      logger.error(`downloadInvoicePdf error: ${error}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
