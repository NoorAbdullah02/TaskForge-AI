import { db } from '../db/index';
import { eq, and, sql, desc, inArray, ne } from 'drizzle-orm';
import { 
    projects, 
    tasks, 
    attendance, 
    leaveRequests, 
    users, 
    projectMembers, 
    workspaceMembers,
    aiRequests,
    sprints
} from '../db/schema';
import { env } from '../config/env';
import { generateJSONResponse, generateTextResponse } from '../lib/gemini';
import { MLService } from './ml.service';

export class EnterpriseAIService {
    
    static async getRoleContext(userId: number, role: string, workspaceId: number): Promise<string> {
        let allowedProjects = await db.select().from(projects).where(eq(projects.workspaceId, workspaceId));
        
        if (role === 'manager') {
            const pmProjects = await db.select({ projectId: projectMembers.projectId })
                .from(projectMembers)
                .where(eq(projectMembers.userId, userId));
            const pmProjectIds = pmProjects.map(p => p.projectId);
            allowedProjects = allowedProjects.filter(p => pmProjectIds.includes(p.id));
        } else if (role === 'employee') {
            // Employees only see projects they are members of
            const empProjects = await db.select({ projectId: projectMembers.projectId })
                .from(projectMembers)
                .where(eq(projectMembers.userId, userId));
            const empProjectIds = empProjects.map(p => p.projectId);
            allowedProjects = allowedProjects.filter(p => empProjectIds.includes(p.id));
        }

        const allowedProjectIds = allowedProjects.map(p => p.id);
        
        let allowedTasks: any[] = [];
        if (allowedProjectIds.length > 0) {
            if (role === 'employee') {
                allowedTasks = await db.select().from(tasks).where(
                    and(
                        inArray(tasks.projectId, allowedProjectIds),
                        eq(tasks.assigneeId, userId)
                    )
                );
            } else {
                allowedTasks = await db.select().from(tasks).where(inArray(tasks.projectId, allowedProjectIds));
            }
        }

        return `
=== ROLE-SCOPED WORKSPACE CONTEXT ===
Workspace ID: ${workspaceId}
Requesting User ID: ${userId}
User Role: ${role}
Accessible Projects (${allowedProjects.length}): ${allowedProjects.map(p => `${p.name} (ID: ${p.id}, Status: ${p.status})`).join(', ') || 'None'}
Accessible Tasks (${allowedTasks.length}): ${allowedTasks.slice(0, 15).map(t => `${t.title} (ID: ${t.id}, Priority: ${t.priority}, Status: ${t.status})`).join('\n') || 'None'}
====================================
`;
    }

    static async callMistral(systemPrompt: string, userMessage: string, history: any[] = []): Promise<string> {
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                ...history.map(msg => ({
                    role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
                    content: typeof msg.content === 'string' ? msg.content : (msg.parts?.[0]?.text || '')
                })),
                { role: 'user', content: userMessage }
            ];

            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${env.MISTRAL_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'mistral-large-latest',
                    messages
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Mistral Large API error: ${response.status} - ${errorText}`);
            }

            const data: any = await response.json();
            return data.choices?.[0]?.message?.content || '';
        } catch (err) {
            console.warn("Mistral Large failed/not configured, trying fallback to Mistral Small", err);
            return generateTextResponse(`${systemPrompt}\n\n${userMessage}`, history);
        }
    }

    static async callMistralJSON<T = any>(prompt: string): Promise<T> {
        try {
            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${env.MISTRAL_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'mistral-large-latest',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Mistral JSON API error: ${response.status} - ${errorText}`);
            }

            const data: any = await response.json();
            const text = data.choices?.[0]?.message?.content || '';
            return JSON.parse(text) as T;
        } catch (err) {
            console.warn("Mistral Large JSON failed, trying fallback to Mistral Small JSON helper", err);
            return generateJSONResponse<T>(prompt);
        }
    }

    static async askCopilot(message: string, history: any[], userId: number, role: string, workspaceId: number): Promise<string> {
        const roleContext = await this.getRoleContext(userId, role, workspaceId);
        const systemPrompt = `You are the TaskForge Enterprise AI Copilot. You operate with strict role-based permissions.
Your role constraints are:
- Employees can only manage/discuss their own tasks.
- Managers can manage/discuss their own projects.
- Workspace Owners/Super Admins have full analytical view.

Here is the current metadata context you are authorized to see:
${roleContext}

Always respond in a professional tone, keeping in mind the user's role-based access limits. Provide clear, direct, and helpful advice.`;

        const reply = await this.callMistral(systemPrompt, message, history);
        
        await db.insert(aiRequests).values({
            userId,
            promptType: 'copilot',
            promptText: message,
            responseText: reply,
            status: 'success'
        });

        return reply;
    }

    static async detectBurnout(targetUserId: number, requestingUserId: number, requestingRole: string, workspaceId: number): Promise<any> {
        // Enforce permissions: employee can only check themselves
        if (requestingRole === 'employee' && targetUserId !== requestingUserId) {
            throw new Error("Access denied. Employees can only analyze their own burnout metrics.");
        }
        
        // If manager, check if they share a project
        if (requestingRole === 'manager') {
            const pmProjects = await db.select({ projectId: projectMembers.projectId })
                .from(projectMembers)
                .where(eq(projectMembers.userId, requestingUserId));
            const pmProjectIds = pmProjects.map(p => p.projectId);

            const targetProjects = await db.select({ projectId: projectMembers.projectId })
                .from(projectMembers)
                .where(eq(projectMembers.userId, targetUserId));
            const targetProjectIds = targetProjects.map(p => p.projectId);

            const sharesProject = pmProjectIds.some(id => targetProjectIds.includes(id));
            if (!sharesProject) {
                throw new Error("Access denied. Managers can only monitor team members within their projects.");
            }
        }

        // Fetch metrics for ML service
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // 1. Overtime hours (mock/average or calculated from attendance/timer - let's calculate based on attendance hours > 8)
        const attendanceRecords = await db.select().from(attendance)
            .where(and(eq(attendance.userId, targetUserId), sql`check_in >= ${thirtyDaysAgoStr}`));
        
        let overtimeHours = 0;
        let presentDays = 0;
        for (const record of attendanceRecords) {
            if (record.checkIn && record.checkOut) {
                const diffMs = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
                const hours = diffMs / (1000 * 60 * 60);
                if (hours > 8) {
                    overtimeHours += (hours - 8);
                }
                presentDays++;
            }
        }

        const attendanceRate = presentDays > 0 ? (presentDays / 22) : 0.85;

        // 2. Overdue tasks
        const userTasks = await db.select().from(tasks).where(eq(tasks.assigneeId, targetUserId));
        const overdueCount = userTasks.filter(t => t.status !== 'done' && t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length;
        
        // 3. Avg completion days
        const completedTasks = userTasks.filter(t => (t.status === 'done' || t.status === 'completed') && t.updatedAt);
        let totalDays = 0;
        for (const t of completedTasks) {
            const start = t.createdAt ? new Date(t.createdAt).getTime() : now.getTime();
            const end = new Date(t.updatedAt!).getTime();
            totalDays += (end - start) / (1000 * 60 * 60 * 24);
        }
        const avgCompletionDays = completedTasks.length > 0 ? (totalDays / completedTasks.length) : 3.0;

        // 4. Workload score
        const activeCount = userTasks.filter(t => t.status !== 'done' && t.status !== 'completed').length;
        const workloadScore = Math.min(100, activeCount * 15);

        // 5. Days since last leave
        const leaveRecords = await db.select().from(leaveRequests)
            .where(and(eq(leaveRequests.userId, targetUserId), eq(leaveRequests.status, 'approved')));
        let daysSinceLastLeave = 30;
        if (leaveRecords.length > 0) {
            const latestLeave = leaveRecords.reduce((latest, current) => {
                return new Date(current.endDate) > new Date(latest.endDate) ? current : latest;
            });
            const diffMs = now.getTime() - new Date(latestLeave.endDate).getTime();
            daysSinceLastLeave = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }

        const payload = {
            overtime_hours_30d: overtimeHours,
            tasks_overdue_count: overdueCount,
            attendance_rate_30d: attendanceRate,
            avg_task_completion_days: avgCompletionDays,
            workload_score: workloadScore,
            days_since_last_leave: daysSinceLastLeave
        };

        // Call ML Service
        const prediction = await MLService.predictBurnout(payload);

        // Fetch User Info
        const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));

        // Use LLM to generate recommendations
        const prompt = `You are an expert HR Specialist and Psychologist. Generate an empathetic, actionable burnout report and wellness recommendations for the following team member based on data.
User Name: ${targetUser?.name || 'User'}
Overtime Hours (30d): ${overtimeHours.toFixed(1)}h
Overdue Tasks: ${overdueCount}
Active Workload Score: ${workloadScore}/100
Attendance Rate: ${(attendanceRate * 100).toFixed(1)}%
Days Since Last Leave: ${daysSinceLastLeave} days

ML Prediction:
- Burnout Risk Level: ${prediction.burnout_risk.toUpperCase()}
- Burnout Probability: ${(prediction.burnout_probability * 100).toFixed(1)}%
- Primary Risk Factors: ${prediction.risk_factors.join(', ')}

Respond ONLY with a JSON object.
JSON structure:
{
  "summary": "Short assessment of user's work-life balance and risk status (2 sentences).",
  "recommendations": [
    "Empathetic recommendation 1",
    "Empathetic recommendation 2",
    "Empathetic recommendation 3"
  ]
}`;

        const reportNarrative = await this.callMistralJSON<{ summary: string; recommendations: string[] }>(prompt);

        return {
            userId: targetUserId,
            userName: targetUser?.name,
            metrics: payload,
            prediction,
            narrative: reportNarrative
        };
    }

    static async getHealthScore(entityType: 'project' | 'task', entityId: number, userId: number, role: string): Promise<any> {
        if (entityType === 'project') {
            const [project] = await db.select().from(projects).where(eq(projects.id, entityId));
            if (!project) throw new Error("Project not found");

            // Enforce permissions: employee / manager must belong to the project
            if (role !== 'super_admin' && role !== 'owner') {
                const membership = await db.select().from(projectMembers)
                    .where(and(eq(projectMembers.projectId, entityId), eq(projectMembers.userId, userId)));
                if (membership.length === 0) {
                    throw new Error("Access denied. You are not a member of this project.");
                }
            }

            const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, entityId));
            const total = projectTasks.length;
            const completed = projectTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
            const overdue = projectTasks.filter(t => t.status !== 'done' && t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()).length;
            
            const completionRate = total > 0 ? (completed / total) : 1.0;
            const overdueRatio = total > 0 ? (overdue / total) : 0.0;

            const members = await db.select().from(projectMembers).where(eq(projectMembers.projectId, entityId));
            const teamSize = members.length || 1;

            let daysRemainingRatio = 0.5;
            if (project.startDate && project.endDate) {
                const totalDur = new Date(project.endDate).getTime() - new Date(project.startDate).getTime();
                const rem = new Date(project.endDate).getTime() - new Date().getTime();
                daysRemainingRatio = totalDur > 0 ? Math.max(0, Math.min(1.0, rem / totalDur)) : 0.0;
            }

            const highPriorityCount = projectTasks.filter(t => t.priority === 'high' || t.priority === 'critical').length;
            const priorityHighRatio = total > 0 ? (highPriorityCount / total) : 0.0;

            // Blockers count
            const blockerCount = projectTasks.filter(t => t.status === 'blocked').length;

            const payload = {
                completion_rate: completionRate,
                overdue_ratio: overdueRatio,
                team_size: teamSize,
                days_remaining_ratio: daysRemainingRatio,
                priority_high_ratio: priorityHighRatio,
                blocker_count: blockerCount
            };

            const mlResult = await MLService.predictHealthScore(payload);

            const prompt = `You are a Senior Project Manager. Formulate a brief performance summary and clear instructions for improvement based on project health data.
Project: ${project.name}
ML Health Score: ${mlResult.health_score}/100
Health Category: ${mlResult.health_level.toUpperCase()}
Completion Rate: ${(completionRate * 100).toFixed(1)}%
Overdue Tasks: ${overdue}
Blockers Active: ${blockerCount}

Respond ONLY with a JSON object.
JSON structure:
{
  "summary": "1-2 sentences summarizing the project health and pace.",
  "suggestions": [
    "Actionable suggestion 1",
    "Actionable suggestion 2"
  ]
}`;
            const narrative = await this.callMistralJSON<{ summary: string; suggestions: string[] }>(prompt);

            return {
                entityType,
                entityId,
                name: project.name,
                metrics: payload,
                healthScore: mlResult.health_score,
                healthLevel: mlResult.health_level,
                contributingFactors: mlResult.contributing_factors,
                narrative
            };
        } else {
            // Task health score
            const [task] = await db.select().from(tasks).where(eq(tasks.id, entityId));
            if (!task) throw new Error("Task not found");

            // Enforce permissions: employee must be assignee or creator
            if (role === 'employee' && task.assigneeId !== userId) {
                throw new Error("Access denied. Employees can only check their assigned tasks.");
            }

            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' && task.status !== 'completed';
            
            // Simple heuristics for task health
            let score = 90;
            const factors: string[] = [];
            if (isOverdue) {
                score -= 30;
                factors.push("Task is overdue");
            }
            if (task.status === 'blocked') {
                score -= 25;
                factors.push("Task is currently blocked");
            }
            if (task.priority === 'critical') {
                factors.push("Critical priority item requires close oversight");
            }

            const prompt = `Write a short, encouraging narrative summary for this task's status.
Task Title: ${task.title}
Estimated Health Score: ${score}/100
Status: ${task.status}
Priority: ${task.priority}
Overdue: ${isOverdue ? 'Yes' : 'No'}

Respond ONLY with a JSON object.
JSON structure:
{
  "summary": "A 1-sentence supportive description of status.",
  "recommendations": ["A quick tip to complete this task faster"]
}`;
            const narrative = await this.callMistralJSON<{ summary: string; recommendations: string[] }>(prompt);

            return {
                entityType,
                entityId,
                name: task.title,
                healthScore: score,
                healthLevel: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'critical',
                contributingFactors: factors,
                narrative
            };
        }
    }

    static async generateEmailDraft(context: string, tone: string, userId: number, role: string): Promise<any> {
        const prompt = `You are a professional Enterprise AI Assistant. Draft an email based on the user's requirements.
User Details: ID ${userId}, Role: ${role}
Tone: ${tone}
Email Context details:
"${context}"

Respond ONLY with a JSON object containing "subject" and "body" keys.
JSON structure:
{
  "subject": "Clear, professional email subject line",
  "body": "Complete formatted email body"
}`;
        return this.callMistralJSON<{ subject: string; body: string }>(prompt);
    }

    static async getRoleDashboard(userId: number, role: string, workspaceId: number): Promise<any> {
        const roleContext = await this.getRoleContext(userId, role, workspaceId);
        const prompt = `Based on the active workspace role context:
${roleContext}

You are the Enterprise AI Advisor. Generate personalized metrics and 3 key recommendations tailored to the user's role:
- Employees: productivity, workload tips, daily standup items
- PMs: project risks, sprint tracking, resource assignment optimization
- Admin/Owners: global health index, high-risk projects, burnout hotspots

Respond ONLY with a JSON object.
JSON structure:
{
  "metricsSummary": "1-sentence summary of the workspace health/workload from their perspective.",
  "recommendations": [
    { "title": "Recommendation Title", "description": "Details of the recommendation" },
    { "title": "Recommendation Title", "description": "Details of the recommendation" },
    { "title": "Recommendation Title", "description": "Details of the recommendation" }
  ]
}`;
        return this.callMistralJSON(prompt);
    }

    static async generateWeeklyReport(userId: number, role: string, workspaceId: number): Promise<any> {
        const roleContext = await this.getRoleContext(userId, role, workspaceId);
        const prompt = `Generate a comprehensive Weekly Report based on this workspace data:
${roleContext}

Analyze completed items, pending tasks, overdue ratios, and synthesize:
1. Achievement highlights
2. Ongoing challenges
3. Focus areas for next week

Respond ONLY with a JSON object.
JSON structure:
{
  "achievements": ["Achievement 1", "Achievement 2"],
  "challenges": ["Challenge 1", "Challenge 2"],
  "focusAreas": ["Focus area 1", "Focus area 2"]
}`;
        return this.callMistralJSON(prompt);
    }
}
