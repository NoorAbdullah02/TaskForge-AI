export const REVIEW_STATUSES = ['review', 'in_review'] as const;

export function isReviewStatus(status?: string | null): boolean {
    if (!status) return false;
    return REVIEW_STATUSES.includes(status as typeof REVIEW_STATUSES[number]);
}

/** Normalize status values coming from the API/client into DB storage format. */
export function normalizeIncomingStatus(status?: string): string | undefined {
    if (!status) return undefined;
    if (status === 'in_review') return 'review';
    if (status === 'in_progress') return 'in-progress';
    return status;
}

/** Normalize DB status values for analytics/UI grouping. */
export function normalizeDisplayStatus(status: string): string {
    if (status === 'in_review') return 'review';
    if (status === 'in_progress') return 'in-progress';
    if (status === 'approved') return 'done';
    if (status === 'rejected') return 'in-progress';
    return status;
}

export function mergeStatusCounts(raw: Record<string, number>): Record<string, number> {
    const merged: Record<string, number> = {};
    for (const [status, count] of Object.entries(raw)) {
        const key = normalizeDisplayStatus(status);
        merged[key] = (merged[key] || 0) + Number(count);
    }
    return merged;
}
