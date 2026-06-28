import { db } from '../db/index';
import { eq, and, sql, desc, gte, count, ne, inArray } from 'drizzle-orm';
import { 
    projects, 
    tasks, 
    attendance, 
    leaveRequests, 
    users, 
    projectMembers, 
    workspaceMembers,
    userSkills, 
    taskDependencies, 
    comments, 
    subtasks,
    teams,
    workspaces
} from '../db/schema';
import { generateJSONResponse } from '../lib/gemini';

export interface AssigneeRecommendation {
    bestMatch: {
        userId: number;
        userName: string;
        matchPercentage: number;
        explanation: string;
    };
    alternatives: Array<{
        userId: number;
        userName: string;
        matchPercentage: number;
        explanation: string;
    }>;
}

export class ProjectIntelligenceService {
    
    // 1. SMART TASK ASSIGNMENT RECOMMENDATION
    static async getSmartAssignmentRecommendation(taskId: number): Promise<AssigneeRecommendation> {
        // Fetch task details
        const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
        if (!task) {
            throw new Error(`Task with ID ${taskId} not found.`);
        }

        // Fetch project members
        const membersList = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            position: users.position
        })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, task.projectId));

        if (membersList.length === 0) {
            throw new Error("No members found in this project.");
        }

        // Gather metrics for each candidate
        const candidatesData = [];
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        for (const u of membersList) {
            // Skills matrix
            const skills = await db.select().from(userSkills).where(eq(userSkills.userId, u.id));
            const skillsStr = skills.map(s => `${s.skillName} (Level ${s.proficiency}/5)`).join(', ') || 'None listed';

            // Active tasks count
            const [activeCountRow] = await db.select({
                cnt: count()
            })
            .from(tasks)
            .where(
                and(
                    eq(tasks.assigneeId, u.id),
                    ne(tasks.status, 'done'),
                    ne(tasks.status, 'completed')
                )
            );
            const activeTasks = Number(activeCountRow?.cnt || 0);

            // Completion rates
            const [completedCountRow] = await db.select({ cnt: count() })
                .from(tasks)
                .where(and(eq(tasks.assigneeId, u.id), inArray(tasks.status, ['done', 'completed'])));
            const [totalCountRow] = await db.select({ cnt: count() })
                .from(tasks)
                .where(eq(tasks.assigneeId, u.id));

            const totalAssigned = Number(totalCountRow?.cnt || 0);
            const completedAssigned = Number(completedCountRow?.cnt || 0);
            const completionRate = totalAssigned > 0 ? Math.round((completedAssigned / totalAssigned) * 100) : 100;

            // Attendance Rate (Past 30 Days checkins vs 22 typical working days)
            const attendanceRows = await db.select().from(attendance)
                .where(and(eq(attendance.userId, u.id), gte(sql`CAST(${attendance.date} AS DATE)`, sql`${thirtyDaysAgoStr}::DATE`)));
            const presentCount = attendanceRows.filter(r => r.status === 'present' || r.status === 'late').length;
            const attendanceRate = Math.min(100, Math.round((presentCount / 22) * 100)) || 90; // Fallback to 90% if new or no checkins

            // Burnout risk calculation
            const burnoutScore = await this.calculateBurnoutScoreForUser(u.id);

            // Project experience (completed tasks in this specific project)
            const [projExpRow] = await db.select({ cnt: count() })
                .from(tasks)
                .where(
                    and(
                        eq(tasks.assigneeId, u.id),
                        eq(tasks.projectId, task.projectId),
                        inArray(tasks.status, ['done', 'completed'])
                    )
                );
            const projectExpCount = Number(projExpRow?.cnt || 0);

            candidatesData.push({
                userId: u.id,
                userName: u.name,
                position: u.position || 'Developer',
                skills: skillsStr,
                activeTasks,
                completionRate,
                attendanceRate,
                burnoutRisk: burnoutScore,
                projectExperienceCount: projectExpCount
            });
        }

        // Format candidate info and prompt Mistral AI
        const prompt = `
        You are an advanced AI workforce optimizer. Review the following task details and list of candidate team members. Suggest the best person for the task.
        
        TASK DETAILS:
        Title: "${task.title}"
        Description: "${task.description || 'No description provided'}"
        Priority: "${task.priority}"
        Work Type: "${task.workType}"

        CANDIDATES:
        ${JSON.stringify(candidatesData, null, 2)}

        Evaluate the candidates based on:
        1. Skills match (does the user have skills matching the task title/description?)
        2. Workload capacity (active tasks should ideally be low)
        3. Completion rate & Past Performance
        4. Attendance rate
        5. Project experience (completed tasks in this project)
        6. Burnout risk (avoid assigning to highly burned out employees)

        Return ONLY a JSON object containing:
        - "bestMatch": {
             "userId": number,
             "userName": string,
             "matchPercentage": number (0-100),
             "explanation": string (Markdown format summary explaining why they are the best fit, including specific matching stats)
          }
        - "alternatives": Array of up to 3 alternative members, each with:
             {
               "userId": number,
               "userName": string,
               "matchPercentage": number,
               "explanation": string
             }
        
        JSON response structure:
        `;

        const aiResponse = await generateJSONResponse<AssigneeRecommendation>(prompt);
        return aiResponse;
    }

    // Auxiliary user burnout score calculation
    private static async calculateBurnoutScoreForUser(userId: number): Promise<number> {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // 1. Overtime hours (count days with > 8.5 hours between check-in and check-out)
        const attendances = await db.select().from(attendance)
            .where(and(eq(attendance.userId, userId), gte(sql`CAST(${attendance.date} AS DATE)`, sql`${thirtyDaysAgoStr}::DATE`)));
        
        let overtimeDays = 0;
        attendances.forEach(att => {
            if (att.checkIn && att.checkOut) {
                const diffHrs = (new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime()) / (1000 * 60 * 60);
                if (diffHrs > 8.5) {
                    overtimeDays++;
                }
            }
        });

        // 2. Active tasks count
        const [activeRow] = await db.select({ cnt: count() }).from(tasks)
            .where(and(eq(tasks.assigneeId, userId), ne(tasks.status, 'done'), ne(tasks.status, 'completed')));
        const activeTasks = Number(activeRow?.cnt || 0);

        // 3. Overdue tasks count (dueDate in the past and not completed)
        const [overdueRow] = await db.select({ cnt: count() }).from(tasks)
            .where(
                and(
                    eq(tasks.assigneeId, userId),
                    ne(tasks.status, 'done'),
                    ne(tasks.status, 'completed'),
                    sql`due_date < NOW()`
                )
            );
        const overdueTasks = Number(overdueRow?.cnt || 0);

        // 4. Attendance issues (low attendance rate or late checkins)
        const lateDays = attendances.filter(att => att.status === 'late').length;

        // Scoring rules:
        // - Overtime: 6 points per day of overtime (max 30 pts)
        // - Active Tasks: 10 points per task > 3 (max 30 pts)
        // - Overdue Tasks: 15 points per overdue task (max 30 pts)
        // - Lateness: 5 points per late day (max 10 pts)
        let score = (overtimeDays * 6) + Math.max(0, (activeTasks - 3) * 10) + (overdueTasks * 15) + (lateDays * 5);
        return Math.min(100, Math.max(0, score));
    }

    // 2. TASK HEALTH SCORE (0-100)
    static async calculateTaskHealthScore(taskId: number): Promise<{
        score: number;
        color: 'Green' | 'Yellow' | 'Red';
        reasons: string[];
    }> {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
        if (!task) {
            throw new Error(`Task with ID ${taskId} not found.`);
        }

        let score = 100;
        const reasons: string[] = [];

        // A. Progress (check subtasks)
        const subtasksList = await db.select().from(subtasks).where(eq(subtasks.taskId, taskId));
        if (subtasksList.length > 0) {
            const completedSubtasks = subtasksList.filter(s => s.isCompleted).length;
            const progressRatio = completedSubtasks / subtasksList.length;
            // Subtract points for lack of subtask progress
            if (progressRatio < 0.25) {
                score -= 15;
                reasons.push("Subtask progress is under 25%");
            } else if (progressRatio < 0.5) {
                score -= 5;
                reasons.push("Subtask progress is under 50%");
            }
        } else {
            // Task status starting points
            if (task.status === 'todo') {
                score -= 10;
                reasons.push("Task is still in To Do status");
            } else if (task.status === 'in_progress') {
                score -= 5;
                reasons.push("Task is currently In Progress");
            }
        }

        // B. Deadline Remaining
        if (task.dueDate && task.status !== 'done' && task.status !== 'completed') {
            const now = new Date();
            const due = new Date(task.dueDate);
            const timeDiff = due.getTime() - now.getTime();
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

            if (daysDiff < 0) {
                const daysOverdue = Math.floor(Math.abs(daysDiff));
                const penalty = Math.min(50, daysOverdue * 10);
                score -= penalty;
                reasons.push(`Task is ${daysOverdue} days overdue (-${penalty} pts)`);
            } else if (daysDiff < 1) {
                score -= 20;
                reasons.push("Task is due in less than 24 hours (-20 pts)");
            } else if (daysDiff < 3) {
                score -= 10;
                reasons.push("Task is due in less than 3 days (-10 pts)");
            }
        }

        // C. Dependencies (Unresolved preceding dependencies)
        const deps = await db.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId));
        for (const dep of deps) {
            const [precedingTask] = await db.select().from(tasks).where(eq(tasks.id, dep.dependsOnTaskId));
            if (precedingTask && precedingTask.status !== 'done' && precedingTask.status !== 'completed') {
                score -= 20;
                reasons.push(`Preceding task dependency "${precedingTask.title}" is unresolved (-20 pts)`);
            }
        }

        // D. Blockers (comments containing "block", "stuck", "blocker")
        const taskComments = await db.select().from(comments).where(eq(comments.taskId, taskId));
        const blockerComments = taskComments.filter(c => 
            /block|stuck|blocker|cannot proceed/i.test(c.content)
        );
        if (blockerComments.length > 0) {
            score -= 25;
            reasons.push("Active blocker reported in comments (-25 pts)");
        }

        // E. Activity (Updates or comments in the past 5 days)
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const lastActivity = task.updatedAt || task.createdAt;
        if (lastActivity && new Date(lastActivity) < fiveDaysAgo) {
            score -= 10;
            reasons.push("No activity or updates on task in the last 5 days (-10 pts)");
        }

        // F. Team Availability (Assignee Leave Check)
        if (task.assigneeId && task.status !== 'done' && task.status !== 'completed') {
            const activeLeaves = await db.select().from(leaveRequests)
                .where(
                    and(
                        eq(leaveRequests.userId, task.assigneeId),
                        eq(leaveRequests.status, 'approved'),
                        sql`NOW() BETWEEN start_date AND end_date`
                    )
                );
            if (activeLeaves.length > 0) {
                score -= 30;
                reasons.push("Assignee is currently on approved leave (-30 pts)");
            }
        }

        // G. Risk Factors (Assignee Workload)
        if (task.assigneeId && task.status !== 'done' && task.status !== 'completed') {
            const [activeRow] = await db.select({ cnt: count() }).from(tasks)
                .where(and(eq(tasks.assigneeId, task.assigneeId), ne(tasks.status, 'done'), ne(tasks.status, 'completed')));
            const activeCount = Number(activeRow?.cnt || 0);
            if (activeCount > 5) {
                score -= 15;
                reasons.push(`Assignee is overloaded with ${activeCount} active tasks (-15 pts)`);
            }
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        let color: 'Green' | 'Yellow' | 'Red' = 'Green';
        if (score < 50) {
            color = 'Red';
        } else if (score < 80) {
            color = 'Yellow';
        }

        return {
            score,
            color,
            reasons: reasons.length > 0 ? reasons : ["Task has no critical warnings."]
        };
    }

    // 3. DEPENDENCY ENGINE (detect risks & return alerts)
    static async validateDependencies(projectId: number): Promise<Array<{
        id: number;
        taskId: number;
        taskTitle: string;
        dependsOnTaskId: number;
        dependsOnTitle: string;
        dependencyType: string;
        severity: 'high' | 'medium' | 'low';
        message: string;
    }>> {
        const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
        const taskMap = new Map(projectTasks.map(t => [t.id, t]));

        const alerts: any[] = [];

        // Query all dependencies for project tasks
        const taskIds = projectTasks.map(t => t.id);
        if (taskIds.length === 0) return [];

        const deps = await db.select().from(taskDependencies).where(inArray(taskDependencies.taskId, taskIds));

        for (const dep of deps) {
            const task = taskMap.get(dep.taskId);
            const parent = taskMap.get(dep.dependsOnTaskId);

            if (!task || !parent) continue;

            const isTaskStarted = task.status !== 'todo' && task.status !== 'backlog';
            const isTaskFinished = task.status === 'done' || task.status === 'completed';
            const isParentStarted = parent.status !== 'todo' && parent.status !== 'backlog';
            const isParentFinished = parent.status === 'done' || parent.status === 'completed';

            // Finish To Start (FS): Preceding task must finish before current task starts
            if (dep.dependencyType === 'FS') {
                if (isTaskStarted && !isParentFinished) {
                    alerts.push({
                        id: dep.id,
                        taskId: task.id,
                        taskTitle: task.title,
                        dependsOnTaskId: parent.id,
                        dependsOnTitle: parent.title,
                        dependencyType: 'FS',
                        severity: 'high',
                        message: `"${task.title}" has started, but its predecessor "${parent.title}" is not completed.`
                    });
                }
            }
            // Start To Start (SS): Preceding task must start before current task starts
            else if (dep.dependencyType === 'SS') {
                if (isTaskStarted && !isParentStarted) {
                    alerts.push({
                        id: dep.id,
                        taskId: task.id,
                        taskTitle: task.title,
                        dependsOnTaskId: parent.id,
                        dependsOnTitle: parent.title,
                        dependencyType: 'SS',
                        severity: 'medium',
                        message: `"${task.title}" has started, but its predecessor "${parent.title}" has not started.`
                    });
                }
            }
            // Finish To Finish (FF): Preceding task must finish before current task finishes
            else if (dep.dependencyType === 'FF') {
                if (isTaskFinished && !isParentFinished) {
                    alerts.push({
                        id: dep.id,
                        taskId: task.id,
                        taskTitle: task.title,
                        dependsOnTaskId: parent.id,
                        dependsOnTitle: parent.title,
                        dependencyType: 'FF',
                        severity: 'high',
                        message: `"${task.title}" is finished, but its predecessor "${parent.title}" is not completed.`
                    });
                }
            }
            // Start To Finish (SF): Preceding task must start before current task finishes
            else if (dep.dependencyType === 'SF') {
                if (isTaskFinished && !isParentStarted) {
                    alerts.push({
                        id: dep.id,
                        taskId: task.id,
                        taskTitle: task.title,
                        dependsOnTaskId: parent.id,
                        dependsOnTitle: parent.title,
                        dependencyType: 'SF',
                        severity: 'medium',
                        message: `"${task.title}" is finished, but its predecessor "${parent.title}" has not started.`
                    });
                }
            }
        }

        return alerts;
    }

    // 4. WORKLOAD BALANCER
    static async getWorkloadBalancer(projectId: number): Promise<{
        heatmap: Array<{ userId: number; userName: string; activeTasksCount: number }>;
        capacities: Array<{ userId: number; userName: string; capacityHours: number; status: 'Underloaded' | 'Optimal' | 'Overloaded' }>;
        aiSuggestions: string;
    }> {
        const membersList = await db.select({
            id: users.id,
            name: users.name
        })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, projectId));

        const heatmap: any[] = [];
        const capacities: any[] = [];

        for (const u of membersList) {
            const [activeRow] = await db.select({ cnt: count() }).from(tasks)
                .where(
                    and(
                        eq(tasks.assigneeId, u.id),
                        ne(tasks.status, 'done'),
                        ne(tasks.status, 'completed')
                    )
                );
            const activeCount = Number(activeRow?.cnt || 0);

            // standard: 40 hrs base. each active task consumes 6 hrs.
            const capacityHours = Math.max(0, 40 - (activeCount * 6));
            let status: 'Underloaded' | 'Optimal' | 'Overloaded' = 'Optimal';
            if (activeCount <= 2) {
                status = 'Underloaded';
            } else if (activeCount > 5) {
                status = 'Overloaded';
            }

            heatmap.push({
                userId: u.id,
                userName: u.name,
                activeTasksCount: activeCount
            });

            capacities.push({
                userId: u.id,
                userName: u.name,
                capacityHours,
                status
            });
        }

        // Call AI for suggestions
        const prompt = `
        Review the workload status of team members working on project ID ${projectId}:
        HEATMAP: ${JSON.stringify(heatmap)}
        CAPACITIES: ${JSON.stringify(capacities)}

        Generate concrete resource balancing recommendations to prevent bottleneck issues.
        Identify who is overloaded and which tasks could be shifted to underloaded members.
        Provide the response in clean, readable markdown format. No codeblocks, just the suggestions.
        `;

        const aiSuggestions = await generateJSONResponse<{ suggestions: string }>(`
        ${prompt}
        Return JSON object: { "suggestions": "Markdown text here" }
        `);

        return {
            heatmap,
            capacities,
            aiSuggestions: aiSuggestions.suggestions
        };
    }

    // 5. BURNOUT DETECTION
    static async getBurnoutRisk(workspaceId: number): Promise<{
        burnoutScores: Array<{
            userId: number;
            userName: string;
            burnoutScore: number;
            riskLevel: 'Low' | 'Medium' | 'High';
            metrics: {
                overtimeDays: number;
                activeTasks: number;
                overdueTasks: number;
                attendanceRate: number;
            };
        }>;
        aiRecommendations: string;
    }> {
        // Fetch all users in workspace
        const membersList = await db.select({
            id: users.id,
            name: users.name
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, workspaceId));

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const burnoutScores: any[] = [];

        for (const u of membersList) {
            // Overtime count
            const attendances = await db.select().from(attendance)
                .where(and(eq(attendance.userId, u.id), gte(sql`CAST(${attendance.date} AS DATE)`, sql`${thirtyDaysAgoStr}::DATE`)));
            
            let overtimeDays = 0;
            attendances.forEach(att => {
                if (att.checkIn && att.checkOut) {
                    const diffHrs = (new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime()) / (1000 * 60 * 60);
                    if (diffHrs > 8.5) overtimeDays++;
                }
            });

            // Active tasks count
            const [activeRow] = await db.select({ cnt: count() }).from(tasks)
                .where(and(eq(tasks.assigneeId, u.id), ne(tasks.status, 'done'), ne(tasks.status, 'completed')));
            const activeTasks = Number(activeRow?.cnt || 0);

            // Overdue tasks count
            const [overdueRow] = await db.select({ cnt: count() }).from(tasks)
                .where(
                    and(
                        eq(tasks.assigneeId, u.id),
                        ne(tasks.status, 'done'),
                        ne(tasks.status, 'completed'),
                        sql`due_date < NOW()`
                    )
                );
            const overdueTasks = Number(overdueRow?.cnt || 0);

            // Attendance Rate
            const presentCount = attendances.filter(r => r.status === 'present' || r.status === 'late').length;
            const attendanceRate = Math.min(100, Math.round((presentCount / 22) * 100)) || 90;

            const score = await this.calculateBurnoutScoreForUser(u.id);
            let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
            if (score >= 70) {
                riskLevel = 'High';
            } else if (score >= 40) {
                riskLevel = 'Medium';
            }

            burnoutScores.push({
                userId: u.id,
                userName: u.name,
                burnoutScore: score,
                riskLevel,
                metrics: {
                    overtimeDays,
                    activeTasks,
                    overdueTasks,
                    attendanceRate
                }
            });
        }

        // Call AI for Burnout Prevention Recommendations
        const prompt = `
        Review this workspace member burnout analysis:
        ${JSON.stringify(burnoutScores, null, 2)}

        Generate professional mental health, workload shifting, and burnout mitigation suggestions.
        Provide the response in clean, readable markdown format.
        `;

        const aiRecommendations = await generateJSONResponse<{ recommendations: string }>(`
        ${prompt}
        Return JSON object: { "recommendations": "Markdown text here" }
        `);

        return {
            burnoutScores,
            aiRecommendations: aiRecommendations.recommendations
        };
    }

    // 6. PROJECT HEALTH DASHBOARD
    static async getProjectHealthOverview(projectId: number): Promise<{
        completionRate: number;
        riskScore: number;
        teamProductivity: number; // completed in last 30 days
        sprintVelocity: number;    // story points completed
        attendanceImpact: string;  // description of correlation
        taskHealthDistribution: { Green: number; Yellow: number; Red: number };
        aiRecommendations: string;
    }> {
        const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
        const totalTasks = projectTasks.length;

        if (totalTasks === 0) {
            return {
                completionRate: 0,
                riskScore: 0,
                teamProductivity: 0,
                sprintVelocity: 0,
                attendanceImpact: "No tasks found in project.",
                taskHealthDistribution: { Green: 0, Yellow: 0, Red: 0 },
                aiRecommendations: "Create tasks to initialize health analysis."
            };
        }

        const completedTasks = projectTasks.filter(t => t.status === 'done' || t.status === 'completed');
        const completionRate = Math.round((completedTasks.length / totalTasks) * 100);

        // Productivity (completed in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const productivityCount = completedTasks.filter(t => t.updatedAt && new Date(t.updatedAt) >= thirtyDaysAgo).length;

        // Task health score distribution and aggregate
        let totalHealthScore = 0;
        const taskHealthDistribution = { Green: 0, Yellow: 0, Red: 0 };

        for (const t of projectTasks) {
            const health = await this.calculateTaskHealthScore(t.id);
            totalHealthScore += health.score;
            taskHealthDistribution[health.color]++;
        }

        const averageHealthScore = Math.round(totalHealthScore / totalTasks);
        // Risk score: Inverse of average health (100 - health score)
        const riskScore = 100 - averageHealthScore;

        // Sprint velocity: points completed in active sprint
        // Priority story points fallback: Critical=8, High=5, Medium=3, Low=1
        let sprintVelocity = 0;
        const completedSprintTasks = completedTasks.filter(t => t.sprintId !== null);
        for (const t of completedSprintTasks) {
            // Map priority to story points fallback
            let points = 3;
            if (t.priority === 'critical') points = 8;
            else if (t.priority === 'high') points = 5;
            else if (t.priority === 'low') points = 1;

            // Check if story is linked
            if (t.storyId) {
                // If it is tied to a story, we can fetch that story points, or stick to this fallback
            }
            sprintVelocity += points;
        }

        // Attendance Impact Analysis
        // Compute active members attendance rate and match with overdue task ratios
        const membersList = await db.select({ id: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, projectId));
        let totalAttendanceRate = 0;
        let membersCount = 0;

        for (const m of membersList) {
            const atts = await db.select().from(attendance)
                .where(and(eq(attendance.userId, m.id), gte(sql`CAST(${attendance.date} AS DATE)`, sql`${thirtyDaysAgo.toISOString().split('T')[0]}::DATE`)));
            const present = atts.filter(r => r.status === 'present' || r.status === 'late').length;
            const rate = Math.min(100, Math.round((present / 22) * 100)) || 90;
            totalAttendanceRate += rate;
            membersCount++;
        }

        const avgTeamAttendance = membersCount > 0 ? Math.round(totalAttendanceRate / membersCount) : 100;
        let attendanceImpact = "Stable. Attendance does not show an adverse impact on task completions.";
        if (avgTeamAttendance < 80) {
            attendanceImpact = "High Risk. Low attendance rates correlate with an increase in overdue task frequencies.";
        }

        // AI Recommendations
        const prompt = `
        Review the following Project health metrics:
        Completion Rate: ${completionRate}%
        Risk Score: ${riskScore} (0-100 where 100 is high risk)
        Team Productivity (Completed in last 30 days): ${productivityCount} tasks
        Sprint Velocity: ${sprintVelocity} points
        Team Attendance Rate: ${avgTeamAttendance}%
        Task Health Distribution: ${JSON.stringify(taskHealthDistribution)}

        Generate high-level PM recommendation checklist to improve Sprint velocity, lower risk, and boost productivity.
        Provide the response in clean, readable markdown format.
        `;

        const aiRecommendations = await generateJSONResponse<{ recommendations: string }>(`
        ${prompt}
        Return JSON object: { "recommendations": "Markdown text here" }
        `);

        return {
            completionRate,
            riskScore,
            teamProductivity: productivityCount,
            sprintVelocity,
            attendanceImpact,
            taskHealthDistribution,
            aiRecommendations: aiRecommendations.recommendations
        };
    }

    // 7. TASK RISK AND AI SCORES & PREDICTIONS
    static async calculateTaskRiskAndAIScores(taskId: number): Promise<{
        riskScore: number;
        aiScore: number;
        delayLikelihood: number;
        predictedCompletionDate: string | null;
        isPredictedOverdue: boolean;
        warnings: string[];
    }> {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
        if (!task) throw new Error("Task not found");

        let riskScore = 0;
        const warnings: string[] = [];

        // 1. Due Date Risk
        let daysDiff = 0;
        if (task.dueDate) {
            const now = new Date();
            const due = new Date(task.dueDate);
            const timeDiff = due.getTime() - now.getTime();
            daysDiff = timeDiff / (1000 * 60 * 60 * 24);

            if (daysDiff < 0) {
                riskScore += 40;
                warnings.push(`Task is overdue`);
            } else if (daysDiff < 1) {
                riskScore += 25;
                warnings.push("Task is due in under 24 hours");
            } else if (daysDiff < 3) {
                riskScore += 15;
                warnings.push("Task is due within 3 days");
            }
        }

        // 2. Priority Risk
        if (task.priority === 'high' || task.priority === 'urgent') {
            riskScore += 15;
            warnings.push("High priority task increase risk impact");
        }

        // 3. Blockers Risk (check comments for blocker keywords)
        const taskComments = await db.select().from(comments).where(eq(comments.taskId, taskId));
        const blockerCount = taskComments.filter(c => /block|stuck|blocker|cannot proceed/i.test(c.content)).length;
        if (blockerCount > 0) {
            riskScore += 25;
            warnings.push("Active blocker mentioned in comments");
        }

        // 4. Dependencies Risk
        const deps = await db.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId));
        let unresolvedDepsCount = 0;
        for (const dep of deps) {
            const [preceding] = await db.select().from(tasks).where(eq(tasks.id, dep.dependsOnTaskId));
            if (preceding && preceding.status !== 'done' && preceding.status !== 'completed' && preceding.status !== 'approved') {
                unresolvedDepsCount++;
            }
        }
        if (unresolvedDepsCount > 0) {
            riskScore += 20;
            warnings.push(`Blocked by ${unresolvedDepsCount} unresolved preceding task dependencies`);
        }

        // 5. Workload Risk
        if (task.assigneeId && task.status !== 'done' && task.status !== 'completed' && task.status !== 'approved') {
            const [activeRow] = await db.select({ cnt: count() }).from(tasks)
                .where(and(eq(tasks.assigneeId, task.assigneeId), ne(tasks.status, 'done'), ne(tasks.status, 'completed'), ne(tasks.status, 'approved')));
            const activeCount = Number(activeRow?.cnt || 0);
            if (activeCount > 5) {
                riskScore += 15;
                warnings.push(`Assignee has high task load (${activeCount} active tasks)`);
            }
        }

        riskScore = Math.min(100, riskScore);

        // Subtask Progress adjustment
        const subtasksList = await db.select().from(subtasks).where(eq(subtasks.taskId, taskId));
        let progressRatio = 0.5; // default if no subtasks
        if (subtasksList.length > 0) {
            const completed = subtasksList.filter(s => s.isCompleted).length;
            progressRatio = completed / subtasksList.length;
        }

        // Calculate AI Score (overall efficiency / quality prediction)
        // High risk decreases AI score, while subtask progress increases it
        let aiScore = Math.round((100 - riskScore) * 0.7 + (progressRatio * 30));
        aiScore = Math.max(0, Math.min(100, aiScore));

        // Delay Likelihood
        let delayLikelihood = riskScore;
        if (task.status === 'done' || task.status === 'completed' || task.status === 'approved') {
            delayLikelihood = 0;
            aiScore = 100;
        }

        // predicted completion date calculation
        let predictedCompletionDate = null;
        let isPredictedOverdue = false;

        if (task.status !== 'done' && task.status !== 'completed' && task.status !== 'approved') {
            const estHours = task.estimatedHours || 8; // assume 8h if not set
            const actHours = Number(task.actualHours) || 0;
            const remainingHours = Math.max(0, estHours - actHours);
            const workingHoursPerDay = 4; // assume average 4 hours active work per day on a single task

            const daysNeeded = Math.ceil(remainingHours / workingHoursPerDay);
            const compDate = new Date();
            compDate.setDate(compDate.getDate() + daysNeeded);
            predictedCompletionDate = compDate.toISOString().split('T')[0];

            if (task.dueDate && compDate > new Date(task.dueDate)) {
                isPredictedOverdue = true;
                if (delayLikelihood < 90) delayLikelihood = Math.min(95, delayLikelihood + 20);
            }
        }

        return {
            riskScore,
            aiScore,
            delayLikelihood: Math.round(delayLikelihood),
            predictedCompletionDate,
            isPredictedOverdue,
            warnings: warnings.length > 0 ? warnings : ["No critical risks detected."]
        };
    }
}
