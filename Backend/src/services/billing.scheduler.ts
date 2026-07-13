import cron from 'node-cron';
import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { subscriptions, workspaces, users, billingHistory } from '../db/schema';
import { NotificationService } from './notification.service';
import { env } from '../config/env';

export function startBillingScheduler() {
    cron.schedule('30 0 * * *', async () => {
        console.log('⏰ Running daily Trial Reminder / Expiry check...');
        try {
            await runTrialReminders();
            await runTrialExpiry();
            await runActiveSubscriptionExpiry();
        } catch (err) {
            console.error('Error running billing scheduler:', err);
        }
    });
}

async function getOwnerAndWorkspace(workspaceId: number) {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
    if (!workspace || !workspace.ownerId) return { workspace: null, owner: null };
    const [owner] = await db.select().from(users).where(eq(users.id, workspace.ownerId)).limit(1);
    return { workspace, owner };
}

export async function runTrialReminders() {
    const trialingSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, 'trialing'));
    const now = new Date();

    for (const sub of trialingSubs) {
        if (!sub.trialEndsAt) continue;
        const daysLeft = Math.ceil((new Date(sub.trialEndsAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (daysLeft !== 3 && daysLeft !== 1) continue;

        const { workspace, owner } = await getOwnerAndWorkspace(sub.workspaceId);
        if (!workspace || !owner) continue;

        await NotificationService.dispatch({
            event: 'subscription.trialReminder',
            userId: owner.id,
            workspaceId: sub.workspaceId,
            entityType: 'subscription',
            entityId: sub.id,
            title: `Your Trial Ends in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
            message: `Your free trial for "${workspace.name}" ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Upgrade now to avoid interruption.`,
            link: '/billing',
            emailTemplate: 'trialReminder',
            emailData: {
                workspaceName: workspace.name,
                daysLeft,
                link: `${env.FRONTEND_URL}/billing`,
            },
        });
    }
}

export async function runTrialExpiry() {
    const now = new Date();
    const expiredSubs = await db.select().from(subscriptions).where(
        and(
            eq(subscriptions.status, 'trialing'),
            sql`${subscriptions.trialEndsAt} < ${now}`
        )
    );

    for (const sub of expiredSubs) {
        await db.update(subscriptions)
            .set({ status: 'expired', updatedAt: now })
            .where(eq(subscriptions.id, sub.id));

        await db.insert(billingHistory).values({
            workspaceId: sub.workspaceId,
            type: 'plan_downgraded',
            description: 'Free trial expired — workspace is now read-only until a plan is purchased',
        });

        const { workspace, owner } = await getOwnerAndWorkspace(sub.workspaceId);
        if (!workspace || !owner) continue;

        await NotificationService.dispatch({
            event: 'subscription.trialExpired',
            userId: owner.id,
            workspaceId: sub.workspaceId,
            entityType: 'subscription',
            entityId: sub.id,
            title: 'Your Trial Has Expired',
            message: `Your free trial for "${workspace.name}" has ended. Upgrade now to restore full access.`,
            link: '/billing',
            emailTemplate: 'trialExpired',
            emailData: {
                workspaceName: workspace.name,
                link: `${env.FRONTEND_URL}/billing`,
            },
        });
    }
}

export async function runActiveSubscriptionExpiry() {
    const now = new Date();
    const expiredSubs = await db.select().from(subscriptions).where(
        and(
            eq(subscriptions.status, 'active'),
            sql`${subscriptions.currentPeriodEnd} < ${now}`
        )
    );

    for (const sub of expiredSubs) {
        const nextStatus = sub.cancelAtPeriodEnd ? 'cancelled' : 'expired';

        await db.update(subscriptions)
            .set({ status: nextStatus, updatedAt: now })
            .where(eq(subscriptions.id, sub.id));

        await db.insert(billingHistory).values({
            workspaceId: sub.workspaceId,
            type: 'plan_downgraded',
            description: `Subscription period ended — plan status set to ${nextStatus}`,
        });

        const { workspace, owner } = await getOwnerAndWorkspace(sub.workspaceId);
        if (!workspace || !owner) continue;

        await NotificationService.dispatch({
            event: 'subscription.expired',
            userId: owner.id,
            workspaceId: sub.workspaceId,
            entityType: 'subscription',
            entityId: sub.id,
            title: `Your Subscription Has ${nextStatus === 'cancelled' ? 'Ended' : 'Expired'}`,
            message: `Your ${sub.plan} subscription for "${workspace.name}" has ended. Upgrade now to restore full access.`,
            link: '/billing',
            emailTemplate: 'trialExpired',
            emailData: {
                workspaceName: workspace.name,
                link: `${env.FRONTEND_URL}/billing`,
            },
        });
    }
}
