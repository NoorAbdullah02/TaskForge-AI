import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscription.service';

export async function subscriptionGate(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (!user || !user.activeWorkspaceId) return next();

    try {
        const isReadOnly = await SubscriptionService.isWorkspaceReadOnly(user.activeWorkspaceId);
        if (isReadOnly) {
            return res.status(402).json({
                message: 'Your workspace trial or subscription has expired. Please upgrade your plan to continue.',
                code: 'SUBSCRIPTION_EXPIRED',
            });
        }
        return next();
    } catch (error) {
        console.error('subscriptionGate error:', error);
        return next();
    }
}
