import { db } from '../db';
import { payments, subscriptions, invoices, billingHistory, subscriptionLogs, workspaces, users } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { NotificationService } from './notification.service';
import { socketService } from './socket.service';
import { env } from '../config/env';
import { getCycleAmountCents, PlanKey, BillingCycle } from '../config/plans';
import { logger } from '../lib/logger';

function formatAmount(cents: number): string {
  return `${(cents / 100).toFixed(2)} BDT`;
}

export class PaymentService {
  static async submitPayment(params: {
    workspaceId: number;
    submittedByUserId: number;
    plan: Exclude<PlanKey, 'free'>;
    billingCycle: BillingCycle;
    method: 'bkash' | 'nagad';
    transactionId: string;
    senderNumber: string;
    screenshotUrl?: string | null;
  }) {
    const { workspaceId, submittedByUserId, plan, billingCycle, method, transactionId, senderNumber, screenshotUrl } = params;

    const [existing] = await db.select().from(payments).where(eq(payments.transactionId, transactionId)).limit(1);
    if (existing) {
      throw new Error('This transaction ID has already been submitted');
    }

    const amountCents = getCycleAmountCents(plan, billingCycle);

    let payment;
    try {
      [payment] = await db.insert(payments).values({
        workspaceId,
        submittedByUserId,
        plan,
        billingCycle,
        amountCents,
        method,
        transactionId,
        senderNumber,
        screenshotUrl: screenshotUrl || null,
        status: 'pending',
      }).returning();
    } catch (err: any) {
      // 23505 = Postgres unique_violation — covers the race where two concurrent
      // submissions pass the existence check above before either commits.
      if (err?.code === '23505') {
        throw new Error('This transaction ID has already been submitted');
      }
      throw err;
    }

    await db.insert(billingHistory).values({
      workspaceId,
      type: 'payment_submitted',
      description: `Payment submitted for ${plan} (${billingCycle}) via ${method}, transaction ${transactionId}`,
    });

    const [owner] = await db.select().from(users).where(eq(users.id, submittedByUserId)).limit(1);
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);

    if (owner) {
      await NotificationService.dispatch({
        event: 'workspace.created',
        userId: submittedByUserId,
        workspaceId,
        entityType: 'payment',
        entityId: payment.id,
        title: 'Payment Submitted — Under Review',
        message: `Your payment of ${formatAmount(amountCents)} for the ${plan} plan is under review.`,
        link: '/billing',
        emailTemplate: 'paymentSubmitted',
        emailData: {
          workspaceName: workspace?.name || 'your workspace',
          plan,
          amountText: formatAmount(amountCents),
          transactionId,
        },
      });
    }

    socketService.broadcastToWorkspace(workspaceId, 'payment.submitted', payment);

    return payment;
  }

  static async listPayments(filters: { status?: string; search?: string; page?: number; limit?: number; workspaceId?: number }) {
    const { status, search, page = 1, limit = 20, workspaceId } = filters;
    const conditions = [];
    if (status) conditions.push(eq(payments.status, status));
    if (workspaceId) conditions.push(eq(payments.workspaceId, workspaceId));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const rows = await db.select().from(payments)
      .where(whereClause)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const filtered = search
      ? rows.filter(p => p.transactionId.toLowerCase().includes(search.toLowerCase()) || p.senderNumber.includes(search))
      : rows;

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(payments).where(whereClause);

    return { payments: filtered, total: count, page, limit };
  }

  private static async generateInvoiceNumber(tx: any, attempt = 0): Promise<string> {
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(invoices);
    const next = count + 1 + attempt;
    return `INV-${String(next).padStart(6, '0')}`;
  }

  // Counting rows isn't safe against two concurrent approvals reading the same count
  // before either commits — retry with the next number on a unique-constraint hit
  // rather than relying on a DB sequence (which would need a schema migration).
  private static async insertInvoiceWithRetry(
    tx: any,
    values: { workspaceId: number; paymentId: number; plan: string; billingCycle: string; amountCents: number },
    maxAttempts = 5,
  ) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const invoiceNumber = await this.generateInvoiceNumber(tx, attempt);
      try {
        const [invoice] = await tx.insert(invoices).values({ ...values, invoiceNumber }).returning();
        return invoice;
      } catch (err: any) {
        if (err?.code === '23505' && attempt < maxAttempts - 1) continue;
        throw err;
      }
    }
    throw new Error('Failed to generate a unique invoice number');
  }

  static async approvePayment(paymentId: number, reviewedByUserId: number) {
    return db.transaction(async (tx) => {
      const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
      if (!payment) throw new Error('Payment not found');
      if (payment.status === 'approved') throw new Error('Payment already approved');

      const [updatedPayment] = await tx.update(payments)
        .set({ status: 'approved', reviewedByUserId, reviewedAt: new Date() })
        .where(eq(payments.id, paymentId))
        .returning();

      let [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.workspaceId, payment.workspaceId)).limit(1);
      const previousPlan = subscription?.plan || 'free';
      const now = new Date();
      const periodEnd = new Date(now);
      if (payment.billingCycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (subscription) {
        [subscription] = await tx.update(subscriptions)
          .set({
            plan: payment.plan,
            billingCycle: payment.billingCycle,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, subscription.id))
          .returning();
      } else {
        [subscription] = await tx.insert(subscriptions).values({
          workspaceId: payment.workspaceId,
          plan: payment.plan,
          billingCycle: payment.billingCycle,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        }).returning();
      }

      const invoice = await this.insertInvoiceWithRetry(tx, {
        workspaceId: payment.workspaceId,
        paymentId: payment.id,
        plan: payment.plan,
        billingCycle: payment.billingCycle,
        amountCents: payment.amountCents,
      });

      await tx.insert(billingHistory).values({
        workspaceId: payment.workspaceId,
        type: 'payment_approved',
        description: `Payment approved — upgraded to ${payment.plan} (${payment.billingCycle})`,
      });

      await tx.insert(subscriptionLogs).values({
        workspaceId: payment.workspaceId,
        subscriptionId: subscription.id,
        action: 'plan_activated',
        performedByUserId: reviewedByUserId,
        previousPlan,
        newPlan: payment.plan,
      });

      return { payment: updatedPayment, subscription, invoice };
    }).then(async (result) => {
      const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, result.payment.workspaceId)).limit(1);
      const ownerId = result.payment.submittedByUserId;

      await NotificationService.dispatch({
        event: 'workspace.created',
        userId: ownerId,
        workspaceId: result.payment.workspaceId,
        entityType: 'payment',
        entityId: result.payment.id,
        title: 'Subscription Activated',
        message: `Your workspace has been upgraded to the ${result.payment.plan} plan.`,
        link: '/billing',
        emailTemplate: 'paymentApproved',
        emailData: {
          workspaceName: workspace?.name || 'your workspace',
          plan: result.payment.plan,
          link: `${env.FRONTEND_URL}/billing`,
        },
      });

      await NotificationService.dispatch({
        event: 'workspace.created',
        userId: ownerId,
        workspaceId: result.payment.workspaceId,
        entityType: 'invoice',
        entityId: result.invoice.id,
        title: `Invoice ${result.invoice.invoiceNumber}`,
        message: `Invoice ${result.invoice.invoiceNumber} has been generated.`,
        link: `/billing`,
        emailTemplate: 'invoiceGenerated',
        emailData: {
          workspaceName: workspace?.name || 'your workspace',
          invoiceNumber: result.invoice.invoiceNumber,
          amountText: formatAmount(result.invoice.amountCents),
          link: `${env.FRONTEND_URL}/billing`,
        },
        skipSocket: true,
      });

      socketService.emitToUser(ownerId, 'payment.verified', result.payment);
      socketService.broadcastToWorkspace(result.payment.workspaceId, 'subscription.updated', result.subscription);

      logger.info(`Payment ${result.payment.id} approved for workspace ${result.payment.workspaceId}`);
      return result;
    });
  }

  static async rejectPayment(paymentId: number, reviewedByUserId: number, reason: string) {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment) throw new Error('Payment not found');

    const [updatedPayment] = await db.update(payments)
      .set({ status: 'rejected', rejectionReason: reason, reviewedByUserId, reviewedAt: new Date() })
      .where(eq(payments.id, paymentId))
      .returning();

    await db.insert(billingHistory).values({
      workspaceId: payment.workspaceId,
      type: 'payment_rejected',
      description: `Payment rejected: ${reason}`,
    });

    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, payment.workspaceId)).limit(1);

    await NotificationService.dispatch({
      event: 'workspace.created',
      userId: payment.submittedByUserId,
      workspaceId: payment.workspaceId,
      entityType: 'payment',
      entityId: payment.id,
      title: 'Payment Verification Failed',
      message: `Your payment could not be verified: ${reason}`,
      link: '/billing',
      emailTemplate: 'paymentRejected',
      emailData: {
        workspaceName: workspace?.name || 'your workspace',
        reason,
        link: `${env.FRONTEND_URL}/billing`,
      },
    });

    socketService.emitToUser(payment.submittedByUserId, 'payment.rejected', updatedPayment);

    return updatedPayment;
  }
}
