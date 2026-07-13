// Plan limits and pricing for the Billing & Subscription module.
// Money is represented as integer "cents" where 1 BDT = 100 cents (paisa),
// to avoid floating point rounding issues when computing totals.

export type PlanKey = 'free' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export const PLAN_LIMITS: Record<PlanKey, {
    maxWorkspaces: number | null;
    maxMembers: number | null;
    maxProjects: number | null;
    storageGb: number | null;
    aiRequests: number | null;
}> = {
    free: { maxWorkspaces: 1, maxMembers: 5, maxProjects: 3, storageGb: 1, aiRequests: 100 },
    pro: { maxWorkspaces: null, maxMembers: null, maxProjects: null, storageGb: 20, aiRequests: 5000 },
    enterprise: { maxWorkspaces: null, maxMembers: null, maxProjects: null, storageGb: null, aiRequests: null },
};

// Prices are per-month, in cents (BDT * 100).
export const PLAN_PRICING: Record<Exclude<PlanKey, 'free'>, Record<BillingCycle, number>> = {
    pro: {
        monthly: 1000, // 10 BDT/month
        yearly: 800,   // 8 BDT/month, billed annually (96 BDT/year)
    },
    enterprise: {
        monthly: 1500, // 15 BDT/month
        yearly: 1300,  // 13 BDT/month, billed annually (156 BDT/year)
    },
};

export function getMonthlyPriceCents(plan: Exclude<PlanKey, 'free'>, cycle: BillingCycle): number {
    return PLAN_PRICING[plan][cycle];
}

// Total amount charged for the billing cycle (yearly = 12 months at the discounted monthly rate).
export function getCycleAmountCents(plan: Exclude<PlanKey, 'free'>, cycle: BillingCycle): number {
    const monthly = getMonthlyPriceCents(plan, cycle);
    return cycle === 'yearly' ? monthly * 12 : monthly;
}

export function getYearlySavingsPercent(plan: Exclude<PlanKey, 'free'>): number {
    const monthlyPrice = PLAN_PRICING[plan].monthly;
    const yearlyPrice = PLAN_PRICING[plan].yearly;
    return Math.round(((monthlyPrice - yearlyPrice) / monthlyPrice) * 100);
}

export const TRIAL_DAYS = 7;
