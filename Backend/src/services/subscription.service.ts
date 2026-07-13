import { db } from '../db';
import { subscriptions, billingHistory, workspaces, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { NotificationService } from './notification.service';
import { env } from '../config/env';
import { TRIAL_DAYS } from '../config/plans';
import { logger } from '../lib/logger';

export class SubscriptionService {
  static async startTrial(workspaceId: number, ownerId: number) {
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const [subscription] = await db.insert(subscriptions).values({
      workspaceId,
      plan: 'free',
      status: 'trialing',
      trialStartedAt,
      trialEndsAt,
      cancelAtPeriodEnd: false,
    }).returning();

    await db.insert(billingHistory).values({
      workspaceId,
      type: 'trial_started',
      description: `7-day free trial started, ends ${trialEndsAt.toDateString()}`,
    });

    const [owner] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);

    if (owner) {
      await NotificationService.dispatch({
        event: 'workspace.created',
        userId: ownerId,
        workspaceId,
        entityType: 'subscription',
        entityId: subscription.id,
        title: 'Your Free Trial Has Started',
        message: `Your 7-day free trial for "${workspace?.name || 'your workspace'}" has started.`,
        link: '/billing',
        emailTemplate: 'trialStarted',
        emailData: {
          workspaceName: workspace?.name || 'your workspace',
          trialEndsAt: trialEndsAt.toDateString(),
          link: `${env.FRONTEND_URL}/billing`,
        },
      });
    }

    return subscription;
  }

  static async getSubscriptionForWorkspace(workspaceId: number) {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).limit(1);
    return subscription || null;
  }

  static computeTrialRemainingDays(subscription: typeof subscriptions.$inferSelect | null): number {
    if (!subscription || !subscription.trialEndsAt) return 0;
    const diffMs = new Date(subscription.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  }

  static async isWorkspaceReadOnly(workspaceId: number): Promise<boolean> {
    const subscription = await this.getSubscriptionForWorkspace(workspaceId);
    if (!subscription) return false;

    if (subscription.status === 'expired' || subscription.status === 'cancelled') return true;

    if (subscription.status === 'trialing' && subscription.trialEndsAt) {
      return new Date(subscription.trialEndsAt).getTime() < Date.now();
    }

    if (subscription.status === 'active' && subscription.currentPeriodEnd) {
      return new Date(subscription.currentPeriodEnd).getTime() < Date.now();
    }

    return false;
  }

  static async cancelSubscription(workspaceId: number, performedByUserId: number) {
    const subscription = await this.getSubscriptionForWorkspace(workspaceId);
    if (!subscription) throw new Error('Subscription not found');

    await db.update(subscriptions)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscription.id));

    await db.insert(billingHistory).values({
      workspaceId,
      type: 'subscription_cancelled',
      description: 'Subscription set to cancel at the end of the current billing period',
    });

    logger.info(`Subscription for workspace ${workspaceId} marked to cancel at period end by user ${performedByUserId}`);
    return this.getSubscriptionForWorkspace(workspaceId);
  }
}
