import { env } from '../config/env';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

export interface DelayPredictionPayload {
    task_count: number;
    milestone_count: number;
    team_size: number;
    days_total: number;
    priority_high_ratio: number;
    avg_task_duration_est: number;
    days_remaining: number;
    current_progress: number;
}

export interface ProjectSuccessPayload {
    task_count: number;
    milestone_count: number;
    team_size: number;
    days_total: number;
    priority_high_ratio: number;
    avg_task_duration_est: number;
    days_remaining: number;
    current_progress: number;
}

export interface DeadlinePredictionPayload {
    type: 'task' | 'sprint' | 'project';
    task_count: number;
    completed_count: number;
    team_size: number;
    days_remaining: number;
    avg_productivity: number;
    high_priority_ratio: number;
}

export interface ProductivityPredictionPayload {
    tasks_assigned_last_30d: number;
    tasks_completed_last_30d: number;
    avg_task_completion_days: number;
    attendance_rate_30d: number;
    overtime_hours_30d: number;
    collaboration_score: number;
}

export interface AvailableMemberPayload {
    userId: number;
    name: string;
    role: string;
    current_task_load: number;
    historical_productivity: number;
    department: string;
}

export interface ResourceRecommendationPayload {
    project_category: string;
    complexity_score: number;
    target_duration_days: number;
    budget_tier: number;
    available_members: AvailableMemberPayload[];
}

export class MLService {
    private static isServiceUnavailable(error: unknown): boolean {
        if (!(error instanceof Error)) return false;
        const message = error.message.toLowerCase();
        const cause = (error as NodeJS.ErrnoException).cause as NodeJS.ErrnoException | undefined;
        return message.includes('fetch failed')
            || cause?.code === 'ECONNREFUSED'
            || message.includes('econnrefused');
    }

    private static heuristicProjectSuccess(payload: ProjectSuccessPayload) {
        const progress = Math.min(1, Math.max(0, payload.current_progress));
        const timeRatio = payload.days_total > 0
            ? Math.min(1, payload.days_remaining / payload.days_total)
            : 0.5;
        const successProbability = Math.min(0.95, Math.max(0.1, 0.35 + progress * 0.45 + timeRatio * 0.2 - payload.priority_high_ratio * 0.15));
        const delayProbability = Math.min(0.9, Math.max(0.05, 1 - successProbability));
        const riskLevel: 'low' | 'medium' | 'high' =
            delayProbability >= 0.55 ? 'high' : delayProbability >= 0.3 ? 'medium' : 'low';

        return {
            success_probability: Number(successProbability.toFixed(2)),
            delay_probability: Number(delayProbability.toFixed(2)),
            risk_level: riskLevel,
            source: 'heuristic' as const,
        };
    }

    private static heuristicDeadline(payload: DeadlinePredictionPayload) {
        const completionRatio = payload.task_count > 0
            ? payload.completed_count / payload.task_count
            : 0;
        const remainingRatio = Math.max(0.1, 1 - completionRatio);
        const predictedDaysNeeded = Math.max(
            1,
            Math.round(payload.days_remaining * remainingRatio + payload.task_count * 0.15)
        );
        const predictedDate = new Date(Date.now() + predictedDaysNeeded * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        return {
            predicted_days_needed: predictedDaysNeeded,
            predicted_date: predictedDate,
            confidence_score: 0.55,
            source: 'heuristic' as const,
        };
    }

    private static async makeRequest<T>(endpoint: string, payload: any): Promise<T> {
        try {
            const url = `${ML_SERVICE_URL}/api/predict${endpoint}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`ML Service HTTP error! status: ${response.status}, body: ${text}`);
            }

            return await response.json() as T;
        } catch (error) {
            console.error(`Error calling ML Service endpoint ${endpoint}:`, error);
            throw error;
        }
    }

    static async predictDelay(payload: DelayPredictionPayload) {
        return this.makeRequest<any>('/delay', payload);
    }

    static async predictProjectSuccess(payload: ProjectSuccessPayload) {
        try {
            return await this.makeRequest<{
                success_probability: number;
                delay_probability: number;
                risk_level: 'low' | 'medium' | 'high';
            }>('/project-success', payload);
        } catch (error) {
            if (this.isServiceUnavailable(error)) {
                console.warn('ML service unavailable — using heuristic project success prediction');
                return this.heuristicProjectSuccess(payload);
            }
            throw error;
        }
    }

    static async predictDeadline(payload: DeadlinePredictionPayload) {
        try {
            return await this.makeRequest<{
                predicted_days_needed: number;
                predicted_date: string;
                confidence_score: number;
            }>('/deadline', payload);
        } catch (error) {
            if (this.isServiceUnavailable(error)) {
                console.warn('ML service unavailable — using heuristic deadline prediction');
                return this.heuristicDeadline(payload);
            }
            throw error;
        }
    }

    static async predictProductivity(payload: ProductivityPredictionPayload) {
        return this.makeRequest<{
            predicted_productivity_score: number;
            productivity_level: 'low' | 'medium' | 'high';
        }>('/productivity', payload);
    }

    static async recommendResources(payload: ResourceRecommendationPayload) {
        return this.makeRequest<{
            recommended_team_size: number;
            recommended_roles: Record<string, number>;
            recommended_members: Array<{
                userId: number;
                name: string;
                role: string;
                suitability_score: number;
                reasons: string[];
            }>;
        }>('/resource', payload);
    }

    static async predictBurnout(payload: {
        overtime_hours_30d: number;
        tasks_overdue_count: number;
        attendance_rate_30d: number;
        avg_task_completion_days: number;
        workload_score: number;
        days_since_last_leave: number;
    }) {
        return this.makeRequest<{
            burnout_risk: 'low' | 'medium' | 'high' | 'critical';
            burnout_probability: number;
            risk_factors: string[];
        }>('/burnout', payload);
    }

    static async predictHealthScore(payload: {
        completion_rate: number;
        overdue_ratio: number;
        team_size: number;
        days_remaining_ratio: number;
        priority_high_ratio: number;
        blocker_count: number;
    }) {
        return this.makeRequest<{
            health_score: number;
            health_level: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
            contributing_factors: string[];
        }>('/health-score', payload);
    }
}

