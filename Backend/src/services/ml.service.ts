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
        return this.makeRequest<{
            success_probability: number;
            delay_probability: number;
            risk_level: 'low' | 'medium' | 'high';
        }>('/project-success', payload);
    }

    static async predictDeadline(payload: DeadlinePredictionPayload) {
        return this.makeRequest<{
            predicted_days_needed: number;
            predicted_date: string;
            confidence_score: number;
        }>('/deadline', payload);
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

