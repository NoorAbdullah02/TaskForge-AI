import type { Request, Response } from 'express';
import { db } from '../db/index';
import { aiRequests, projects, tasks, attendance, users, workspaceMembers, projectMembers, sprints } from '../db/schema';
import { generateJSONResponse, generateTextResponse } from '../lib/gemini';
import { ProjectService } from '../services/project.service';
import { TaskService } from '../services/task.service';
import { eq, inArray, and, gte, count, sql, ne, desc } from 'drizzle-orm';
import { EmailTriggerService } from '../services/emailTrigger.service';
import { MLService } from '../services/ml.service';
import { EnterpriseAIService } from '../services/enterpriseAI.service';
import { ProjectIntelligenceService } from '../services/projectIntelligence.service';



export class AIController {
    static async generateTasks(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { projectDescription } = req.body;
            if (!projectDescription || projectDescription.trim().length === 0) {
                return res.status(400).json({ message: 'Project description is required' });
            }

            const prompt = `You are an expert project manager. Based on the following project description, generate a complete structured project roadmap containing tasks, subtasks, and timelines.
Project Description:
"${projectDescription}"

Respond ONLY with a JSON object containing a "tasks" array.
Do not include any markdown formatting, prefix or suffix like \`\`\`json. Return only the raw JSON.
JSON structure:
{
  "tasks": [
    {
      "title": "Task title, e.g., Set up Database Schema",
      "description": "Brief description of task responsibilities",
      "priority": "low" | "medium" | "high" | "critical",
      "daysToComplete": 3,
      "subtasks": ["Subtask item 1", "Subtask item 2"]
    }
  ]
}`;

            const responseJSON = await generateJSONResponse(prompt);

            // Log AI Request
            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'task-generator',
                promptText: projectDescription,
                responseText: JSON.stringify(responseJSON),
                status: 'success'
            });

            return res.status(200).json(responseJSON);
        } catch (error: any) {
            console.error('Error in generateTasks AI controller:', error);
            return res.status(500).json({ message: error.message || 'AI Task generation failed' });
        }
    }

    static async summarizeMeeting(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { meetingNotes } = req.body;
            if (!meetingNotes || meetingNotes.trim().length === 0) {
                return res.status(400).json({ message: 'Meeting notes are required' });
            }

            const prompt = `You are an expert AI productivity assistant. Analyze the following meeting notes and generate a summary, key action items, risks identified, and concrete tasks that should be added to the project management system.
Meeting Notes:
"${meetingNotes}"

Respond ONLY with a JSON object.
Do not include any markdown formatting, prefix or suffix like \`\`\`json. Return only the raw JSON.
JSON structure:
{
  "summary": "High-level summary of the meeting goals, topics discussed, and final outcomes (1-2 paragraphs).",
  "actionItems": [
    {
      "task": "Specific action item description",
      "assigneeHint": "Name of person suggested or implied, or 'Unassigned' if none"
    }
  ],
  "risks": [
    {
      "risk": "Description of risk or blocker identified",
      "severity": "low" | "medium" | "high"
    }
  ],
  "generatedTasks": [
    {
      "title": "Clear task title",
      "description": "Task description derived from action items",
      "priority": "low" | "medium" | "high" | "critical"
    }
  ]
}`;

            const responseJSON = await generateJSONResponse(prompt);

            // Log AI Request
            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'meeting-summarizer',
                promptText: meetingNotes,
                responseText: JSON.stringify(responseJSON),
                status: 'success'
            });

            return res.status(200).json(responseJSON);
        } catch (error: any) {
            console.error('Error in summarizeMeeting AI controller:', error);
            return res.status(500).json({ message: error.message || 'AI Meeting summarization failed' });
        }
    }

    static async copilot(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { message, history } = req.body;
            if (!message || message.trim().length === 0) {
                return res.status(400).json({ message: 'Message is required' });
            }

            // Fetch user projects and tasks context to make it context-aware!
            const projectsList = await ProjectService.getUserProjects(user.id, user.activeWorkspaceId || 0, user.role || 'employee') as any[];
            const tasksList = await TaskService.getUserTasks(user.id);

            const activeProjectsContext = projectsList.map(p => `- ${p.name} (Status: ${p.status})`).join('\n');
            const activeTasksContext = tasksList.map(t => `- Task: "${t.title}" (Status: ${t.status}, Priority: ${t.priority}, Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'})`).join('\n');

            const workspaceContext = `
Workspace Context for user "${user.name}":
Active Projects:
${activeProjectsContext || 'No projects found.'}

Tasks in Workspace:
${activeTasksContext || 'No tasks found.'}
`;

            const systemPrompt = `You are TaskForge Copilot, a helpful AI project assistant integrated into the TaskForge AI application.
Your goal is to assist the user in managing their workspace, projects, and tasks. You have access to their current workspace details below:

${workspaceContext}

Instructions:
- Be concise, helpful, and friendly.
- Refer to their active projects or tasks by name if they ask questions related to them.
- If the user asks general coding or non-workspace questions, help them with that as well.
- Current User Message: "${message}"`;

            const reply = await generateTextResponse(systemPrompt, history || []);

            // Log AI Request
            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'copilot',
                promptText: message,
                responseText: reply,
                status: 'success'
            });

            return res.status(200).json({ reply });
        } catch (error: any) {
            console.error('Error in Copilot AI controller:', error);
            return res.status(500).json({ message: error.message || 'AI Copilot request failed' });
        }
    }

    static async planSprint(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { sprintName, goal, tasksList } = req.body;
            const prompt = `You are an Agile Sprint Coach. Given the sprint name "${sprintName || 'Sprint 1'}" and sprint goal "${goal || 'None'}", organize the following tasks into a sprint plan:
Tasks:
${JSON.stringify(tasksList || [])}

Respond ONLY with a JSON object.
Do not include any markdown formatting, prefix or suffix like \`\`\`json. Return only the raw JSON.
JSON structure:
{
  "goalRecommendation": "Refined sprint goal recommendation",
  "pointsAllocation": [
    {
      "taskId": 1,
      "taskTitle": "Task title",
      "recommendedPoints": 5,
      "reason": "Brief justification based on description"
    }
  ],
  "sprintSummary": "Brief Agile coach sprint setup recommendation."
}`;

            const responseJSON = await generateJSONResponse(prompt);

            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'sprint-planner',
                promptText: `Sprint: ${sprintName}, Goal: ${goal}`,
                responseText: JSON.stringify(responseJSON),
                status: 'success'
            });

            return res.status(200).json(responseJSON);
        } catch (error: any) {
            console.error('Error in planSprint AI controller:', error);
            return res.status(500).json({ message: error.message || 'AI Sprint planning failed' });
        }
    }

    static async generateDocs(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { docType, topicDescription } = req.body;
            if (!docType || !topicDescription) {
                return res.status(400).json({ message: 'Document type and topic description are required' });
            }

            const prompt = `You are a Technical Writer. Write a high-quality, professional markdown documentation for a "${docType}" about:
"${topicDescription}"

Respond ONLY with a JSON object.
Do not include any markdown formatting, prefix or suffix like \`\`\`json. Return only the raw JSON.
JSON structure:
{
  "title": "Document Title",
  "markdownContent": "Detailed markdown documentation text with headers, code blocks, lists, and explanations."
}`;

            const responseJSON = await generateJSONResponse(prompt);

            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'doc-generator',
                promptText: `Type: ${docType}, Topic: ${topicDescription}`,
                responseText: JSON.stringify(responseJSON),
                status: 'success'
            });

            return res.status(200).json(responseJSON);
        } catch (error: any) {
            console.error('Error in generateDocs AI controller:', error);
            return res.status(500).json({ message: error.message || 'AI Documentation generation failed' });
        }
    }

    static async analyzeRisks(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { projectId } = req.body;
            if (!projectId) return res.status(400).json({ message: 'Project ID is required' });

            const pId = parseInt(projectId, 10);
            if (isNaN(pId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const details = await ProjectService.getProjectDetails(pId);
            if (!details) return res.status(404).json({ message: 'Project not found' });

            const activeTasks = details.tasks.filter(t => !t.isMilestone);
            const prompt = `You are a Risk Analyst. Evaluate the following active tasks for project "${details.name}" and identify bottleneck risks, overdue dependencies, and delay predictions:
Tasks:
${JSON.stringify(activeTasks)}

Respond ONLY with a JSON object.
Do not include any markdown formatting, prefix or suffix like \`\`\`json. Return only the raw JSON.
JSON structure:
{
  "healthScore": 85,
  "risksDetected": [
    {
      "riskType": "Timeline Bottleneck",
      "taskTitle": "Task title",
      "severity": "medium",
      "description": "Risk details"
    }
  ],
  "recommendations": [
    "Preventative recommendation 1",
    "Preventative recommendation 2"
  ]
}`;

            const responseJSON = await generateJSONResponse(prompt);

            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'risk-analyzer',
                promptText: `Project: ${details.name} (ID: ${pId})`,
                responseText: JSON.stringify(responseJSON),
                status: 'success'
            });

            return res.status(200).json(responseJSON);
        } catch (error: any) {
            console.error('Error in analyzeRisks AI controller:', error);
            return res.status(500).json({ message: error.message || 'AI Risk analysis failed' });
        }
    }

    static async sendWeeklySummaryEmail(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) {
                return res.status(400).json({ message: 'No active workspace selected' });
            }

            // 1. Fetch workspace projects
            const wsProjects = await db.select().from(projects).where(eq(projects.workspaceId, activeWorkspaceId));
            if (wsProjects.length === 0) {
                const summary = "You don't have any projects in your workspace yet. Create a project to start tracking your performance!";
                await EmailTriggerService.sendAIGeneratedReport(user.email, user.name, summary, activeWorkspaceId);
                return res.status(200).json({ success: true, summary });
            }

            const projectIds = wsProjects.map(p => p.id);

            // 2. Fetch tasks in these projects
            const wsTasks = await db.select().from(tasks).where(inArray(tasks.projectId, projectIds));

            // Calculate Project Health Score: percentage of completed tasks in workspace
            const totalTasksCount = wsTasks.length;
            const completedTasksCount = wsTasks.filter(t => t.status?.toLowerCase() === 'done').length;
            const projectHealthScore = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100;

            // 3. Filter tasks assigned to current user
            const userTasks = wsTasks.filter(t => t.assigneeId === user.id);
            const pendingTasks = userTasks.filter(t => t.status?.toLowerCase() !== 'done');
            const completedTasks = userTasks.filter(t => t.status?.toLowerCase() === 'done');
            const now = new Date();
            const delayedTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);

            // 4. Fetch user attendance for last 7 days
            const attendanceLogs = await db.select().from(attendance).where(eq(attendance.userId, user.id));
            // filter last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const weeklyAttendance = attendanceLogs.filter(a => {
                const checkInDate = a.checkIn ? new Date(a.checkIn) : new Date(a.date);
                return checkInDate >= sevenDaysAgo;
            });

            const presentCount = weeklyAttendance.filter(a => a.status === 'present').length;
            const lateCount = weeklyAttendance.filter(a => a.status === 'late').length;
            const absentCount = weeklyAttendance.filter(a => a.status === 'absent').length;

            // 5. Build prompt for AI summary
            const prompt = `You are TaskForge AI Weekly Email Assistant. Analyze the user's weekly performance and write a concise, motivational, executive summary email report.
User: ${user.name}
Active Workspace Projects: ${wsProjects.map(p => p.name).join(', ')}
Project Health Score (Workspace-wide): ${projectHealthScore}%

User Personal Task Statistics:
- Pending Tasks count: ${pendingTasks.length}
${pendingTasks.slice(0, 5).map(t => `  * ${t.title} (Priority: ${t.priority || 'medium'})`).join('\n')}
- Completed Tasks count: ${completedTasks.length}
${completedTasks.slice(0, 5).map(t => `  * ${t.title}`).join('\n')}
- Delayed/Overdue Tasks count: ${delayedTasks.length}
${delayedTasks.slice(0, 5).map(t => `  * ${t.title} (Was due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'})`).join('\n')}

User Weekly Attendance Summary:
- Present days: ${presentCount}
- Late check-ins: ${lateCount}
- Absent days: ${absentCount}

Please generate a professional weekly executive summary. Highlight achievements, point out overdue items clearly as action items, analyze their attendance, and give a productivity recommendation. Keep it under 250 words and format it in clear HTML-friendly tags like <p>, <ul>, <li>, and <strong>.`;

            const summary = await generateTextResponse(prompt);

            // 6. Send the Email
            await EmailTriggerService.sendAIGeneratedReport(user.email, user.name, summary, activeWorkspaceId);

            // 7. Log the AI Request
            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'weekly-summary',
                promptText: `Weekly summary for user ${user.id} in workspace ${activeWorkspaceId}`,
                responseText: summary,
                status: 'success'
            });

            return res.status(200).json({ success: true, summary });
        } catch (error: any) {
            console.error('Error in sendWeeklySummaryEmail AI controller:', error);
            return res.status(500).json({ message: error.message || 'AI Weekly summary failed' });
        }
    }

    static async planSprintV2(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { projectDescription } = req.body;
            if (!projectDescription || projectDescription.trim().length === 0) {
                return res.status(400).json({ message: 'Project description is required' });
            }

            const prompt = `You are an expert Agile Scrum Master and Project Architect. Based on the following project description, generate an optimized sprint planning blueprint.
Project Description:
"${projectDescription}"

Respond ONLY with a JSON object.
Do not include any markdown formatting, prefix or suffix like \`\`\`json. Return only the raw JSON.
JSON structure:
{
  "sprintBreakdown": [
    {
      "sprintName": "Sprint 1: Setup & MVP Features",
      "durationDays": 14,
      "goal": "Establish primary workspace environment, base navigation, and databases.",
      "tasks": [
        { "title": "Configure Drizzle ORM Schema", "description": "Define database relations and models", "points": 3, "role": "Developer" },
        { "title": "Wireframe Core Pages", "description": "Create Figma mockups for task board and dashboard", "points": 2, "role": "Designer" }
      ]
    }
  ],
  "teamAllocation": [
    { "role": "Developer", "count": 2, "allocation": "Primary backend development and database schema creation." },
    { "role": "Designer", "count": 1, "allocation": "UI mockup, wireframes, and design system setup." },
    { "role": "Tester", "count": 1, "allocation": "Writing automation tests, manual verification, and API validation." }
  ],
  "timeline": {
    "startDate": "${new Date().toISOString().split('T')[0]}",
    "endDate": "${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
    "totalDurationDays": 30
  },
  "risks": [
    { "risk": "Database migration conflicts", "severity": "medium", "mitigation": "Use branching migrations and staging checks." }
  ]
}`;

            const responseJSON = await generateJSONResponse(prompt);

            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'sprint-planner-v2',
                promptText: projectDescription.slice(0, 500),
                responseText: JSON.stringify(responseJSON),
                status: 'success'
            });

            return res.status(200).json(responseJSON);
        } catch (error: any) {
            console.error('Error in planSprintV2 controller:', error);
            return res.status(500).json({ message: error.message || 'AI Sprint Planning failed' });
        }
    }

    static async resourcePlanner(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { projectId } = req.params;
            const pId = parseInt(projectId, 10);
            if (isNaN(pId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const [project] = await db.select().from(projects).where(eq(projects.id, pId));
            if (!project) return res.status(404).json({ message: 'Project not found' });

            // Fetch workspace members
            const workspaceMembersList = await db.select({
                id: users.id,
                name: users.name,
                role: users.role,
                position: users.position,
                departmentId: users.departmentId
            })
            .from(workspaceMembers)
            .innerJoin(users, eq(workspaceMembers.userId, users.id))
            .where(eq(workspaceMembers.workspaceId, project.workspaceId || 0));

            // Fetch tasks for current workload calculation
            const availableMembersPayload = [];
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            for (const member of workspaceMembersList) {
                // Task workload count
                const [activeTasksRow] = await db.select({ cnt: count() })
                    .from(tasks)
                    .where(
                        and(
                            eq(tasks.assigneeId, member.id),
                            ne(tasks.status, 'done'),
                            ne(tasks.status, 'completed')
                        )
                    );
                const activeTasks = Number(activeTasksRow?.cnt || 0);

                // Fetch historical productivity score (fallback to 80)
                const [completedRow] = await db.select({ cnt: count() })
                    .from(tasks)
                    .where(
                        and(
                            eq(tasks.assigneeId, member.id),
                            inArray(tasks.status, ['done', 'completed'])
                        )
                    );
                const completedTasks = Number(completedRow?.cnt || 0);
                const productivity = completedTasks > 0 ? Math.min(100, 60 + completedTasks * 5) : 80;

                // Department name mapper
                let deptName = 'Engineering';
                if (member.role === 'designer' || member.position?.toLowerCase().includes('design')) {
                    deptName = 'Design';
                } else if (member.role === 'qa' || member.position?.toLowerCase().includes('qa')) {
                    deptName = 'Quality Assurance';
                }

                availableMembersPayload.push({
                    userId: member.id,
                    name: member.name,
                    role: member.role === 'admin' ? 'Project Manager' : (member.role === 'designer' ? 'Designer' : (member.role === 'qa' ? 'QA' : 'Developer')),
                    current_task_load: activeTasks,
                    historical_productivity: productivity,
                    department: deptName
                });
            }

            const payload = {
                project_category: project.workTypes || 'Web App',
                complexity_score: 7,
                target_duration_days: project.endDate && project.startDate ? Math.max(1, Math.round((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))) : 60,
                budget_tier: 3,
                available_members: availableMembersPayload
            };

            const mlResponse = await MLService.recommendResources(payload);

            // Extract best developer, best designer, best tester
            const bestDev = mlResponse.recommended_members.find(m => m.role === 'Developer');
            const bestDesigner = mlResponse.recommended_members.find(m => m.role === 'Designer');
            const bestTester = mlResponse.recommended_members.find(m => m.role === 'QA');

            return res.status(200).json({
                bestDeveloper: bestDev || null,
                bestDesigner: bestDesigner || null,
                bestTester: bestTester || null,
                recommendedTeamSize: mlResponse.recommended_team_size,
                recommendedRoles: mlResponse.recommended_roles,
                recommendedMembers: mlResponse.recommended_members
            });
        } catch (error: any) {
            console.error('Error in resourcePlanner controller:', error);
            return res.status(500).json({ message: error.message || 'AI Resource Planning failed' });
        }
    }

    static async predictDeadline(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { type, id } = req.params;
            const targetId = parseInt(id, 10);
            if (isNaN(targetId)) return res.status(400).json({ message: 'Invalid Target ID' });

            let taskCount = 1;
            let completedCount = 0;
            let teamSize = 1;
            let daysRemaining = 5;
            let avgProductivity = 85.0;
            let highPriorityRatio = 0.2;

            if (type === 'task') {
                const [task] = await db.select().from(tasks).where(eq(tasks.id, targetId));
                if (!task) return res.status(404).json({ message: 'Task not found' });
                taskCount = 1;
                completedCount = (task.status === 'done' || task.status === 'completed') ? 1 : 0;
                highPriorityRatio = (task.priority === 'critical' || task.priority === 'high') ? 1.0 : 0.0;
                if (task.dueDate) {
                    daysRemaining = Math.max(0.5, (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                }
            } else if (type === 'sprint') {
                const [sprint] = await db.select().from(sprints).where(eq(sprints.id, targetId));
                if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

                const sprintTasks = await db.select().from(tasks).where(eq(tasks.sprintId, targetId));
                taskCount = sprintTasks.length || 1;
                completedCount = sprintTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
                const highCount = sprintTasks.filter(t => t.priority === 'critical' || t.priority === 'high').length;
                highPriorityRatio = highCount / taskCount;
                
                const uniqueAssignees = Array.from(new Set(sprintTasks.map(t => t.assigneeId).filter(Boolean)));
                teamSize = uniqueAssignees.length || 1;

                if (sprint.endDate) {
                    daysRemaining = Math.max(0.5, (new Date(sprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                } else {
                    daysRemaining = 14;
                }
            } else if (type === 'project') {
                const [project] = await db.select().from(projects).where(eq(projects.id, targetId));
                if (!project) return res.status(404).json({ message: 'Project not found' });

                const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, targetId));
                taskCount = projectTasks.length || 1;
                completedCount = projectTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
                const highCount = projectTasks.filter(t => t.priority === 'critical' || t.priority === 'high').length;
                highPriorityRatio = highCount / taskCount;
                
                const uniqueAssignees = Array.from(new Set(projectTasks.map(t => t.assigneeId).filter(Boolean)));
                teamSize = uniqueAssignees.length || 1;

                if (project.endDate) {
                    daysRemaining = Math.max(0.5, (new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                } else {
                    daysRemaining = 30;
                }
            } else {
                return res.status(400).json({ message: 'Invalid target type. Must be task, sprint, or project' });
            }

            const payload = {
                type: type as 'task' | 'sprint' | 'project',
                task_count: taskCount,
                completed_count: completedCount,
                team_size: teamSize,
                days_remaining: daysRemaining,
                avg_productivity: avgProductivity,
                high_priority_ratio: highPriorityRatio
            };

            const mlResponse = await MLService.predictDeadline(payload);
            return res.status(200).json(mlResponse);
        } catch (error: any) {
            console.error('Error in predictDeadline controller:', error);
            return res.status(500).json({ message: error.message || 'AI Deadline Prediction failed' });
        }
    }

    static async predictProjectSuccess(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { projectId } = req.params;
            const pId = parseInt(projectId, 10);
            if (isNaN(pId)) return res.status(400).json({ message: 'Invalid Project ID' });

            const [project] = await db.select().from(projects).where(eq(projects.id, pId));
            if (!project) return res.status(404).json({ message: 'Project not found' });

            const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, pId));
            const totalTasks = projectTasks.length || 1;
            const milestoneCount = projectTasks.filter(t => t.isMilestone).length;
            const uniqueAssignees = Array.from(new Set(projectTasks.map(t => t.assigneeId).filter(Boolean)));
            const teamSize = uniqueAssignees.length || 1;

            const daysTotal = project.endDate && project.startDate 
                ? Math.max(1, Math.round((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)))
                : 30;

            const highCount = projectTasks.filter(t => t.priority === 'critical' || t.priority === 'high').length;
            const priorityHighRatio = highCount / totalTasks;
            const avgTaskDurationEst = daysTotal / totalTasks;
            
            const daysRemaining = project.endDate 
                ? Math.max(0.5, (new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 15;

            const completedCount = projectTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
            const currentProgress = completedCount / totalTasks;

            const payload = {
                task_count: totalTasks,
                milestone_count: milestoneCount,
                team_size: teamSize,
                days_total: daysTotal,
                priority_high_ratio: priorityHighRatio,
                avg_task_duration_est: avgTaskDurationEst,
                days_remaining: daysRemaining,
                current_progress: currentProgress
            };

            const mlResponse = await MLService.predictProjectSuccess(payload);
            return res.status(200).json(mlResponse);
        } catch (error: any) {
            console.error('Error in predictProjectSuccess controller:', error);
            return res.status(500).json({ message: error.message || 'AI Project Success Prediction failed' });
        }
    }

    static async predictProductivity(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { userId } = req.params;
            const uId = parseInt(userId, 10);
            if (isNaN(uId)) return res.status(400).json({ message: 'Invalid User ID' });

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const userTasks = await db.select().from(tasks).where(eq(tasks.assigneeId, uId));
            const tasksAssigned = userTasks.filter(t => t.createdAt >= thirtyDaysAgo).length;
            const tasksCompleted = userTasks.filter(t => (t.status === 'done' || t.status === 'completed') && t.updatedAt >= thirtyDaysAgo).length;

            const attendances = await db.select().from(attendance)
                .where(and(eq(attendance.userId, uId), gte(sql`CAST(${attendance.date} AS DATE)`, sql`${thirtyDaysAgo.toISOString().split('T')[0]}::DATE`)));
            const presentCount = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
            const attendanceRate = Math.min(1.0, presentCount / 22);

            let overtimeHours = 0;
            attendances.forEach(att => {
                if (att.checkIn && att.checkOut) {
                    const diffHrs = (new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime()) / (1000 * 60 * 60);
                    if (diffHrs > 8.5) {
                        overtimeHours += (diffHrs - 8.5);
                    }
                }
            });

            const payload = {
                tasks_assigned_last_30d: tasksAssigned,
                tasks_completed_last_30d: tasksCompleted,
                avg_task_completion_days: 3.5,
                attendance_rate_30d: attendanceRate,
                overtime_hours_30d: overtimeHours,
                collaboration_score: 80.0
            };

            const mlResponse = await MLService.predictProductivity(payload);
            return res.status(200).json(mlResponse);
        } catch (error: any) {
            console.error('Error in predictProductivity controller:', error);
            return res.status(500).json({ message: error.message || 'AI Productivity Prediction failed' });
        }
    }

    static async getDailyStandup(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { regenerate } = req.query;

            // Check for existing standup today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            if (regenerate !== 'true') {
                const existing = await db.select().from(aiRequests)
                    .where(
                        and(
                            eq(aiRequests.userId, user.id),
                            eq(aiRequests.promptType, 'daily-standup'),
                            gte(aiRequests.createdAt, todayStart)
                        )
                    )
                    .orderBy(desc(aiRequests.createdAt))
                    .limit(1);

                if (existing.length > 0) {
                    return res.status(200).json(JSON.parse(existing[0].responseText));
                }
            }

            // Generate a new daily standup
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const userTasks = await db.select().from(tasks).where(eq(tasks.assigneeId, user.id));
            const completedYesterday = userTasks.filter(t => (t.status === 'done' || t.status === 'completed') && t.updatedAt >= yesterday);
            const pendingToday = userTasks.filter(t => t.status !== 'done' && t.status !== 'completed');
            const blockers = pendingToday.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

            const prompt = `You are a professional Scrum Master. Based on the user's task updates, compile a clean, structured Daily Standup report.
User: ${user.name}
Completed Yesterday:
${completedYesterday.map(t => `- ${t.title}`).join('\n') || "None"}
In Progress / Planned for Today:
${pendingToday.slice(0, 5).map(t => `- ${t.title} (Priority: ${t.priority})`).join('\n') || "None"}
Blockers & Overdue items:
${blockers.map(t => `- ${t.title} is overdue! (Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'})`).join('\n') || "None"}

Respond ONLY with a JSON object.
Do not include any markdown formatting, prefix or suffix like \`\`\`json. Return only the raw JSON.
JSON structure:
{
  "yesterday": "Detailed summary of achievements from yesterday.",
  "today": "List of planned activities and focus areas for today.",
  "blockers": "Any blockers, warnings, or overdue risk summaries, or 'None' if clear."
}`;

            const responseJSON = await generateJSONResponse(prompt);

            await db.insert(aiRequests).values({
                userId: user.id,
                promptType: 'daily-standup',
                promptText: 'System dynamic standup generation',
                responseText: JSON.stringify(responseJSON),
                status: 'success'
            });

            return res.status(200).json(responseJSON);
        } catch (error: any) {
            console.error('Error in getDailyStandup controller:', error);
            return res.status(500).json({ message: error.message || 'AI Standup generation failed' });
        }
    }

    static async getExecutiveStats(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const activeWorkspaceId = user.activeWorkspaceId;
            if (!activeWorkspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            // 1. Project Health
            const wsProjects = await db.select().from(projects).where(eq(projects.workspaceId, activeWorkspaceId));
            if (wsProjects.length === 0) {
                return res.status(200).json({
                    projectHealth: 100,
                    teamProductivity: 85,
                    aiRiskScore: 10,
                    forecasts: { delayDays: 0, completionRate: 100, risksDetected: 0 }
                });
            }

            const projectIds = wsProjects.map(p => p.id);
            const wsTasks = await db.select().from(tasks).where(inArray(tasks.projectId, projectIds));
            
            const totalTasks = wsTasks.length;
            const completedTasks = wsTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
            const projectHealth = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

            // 2. Team Productivity
            const workspaceMembersList = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, activeWorkspaceId));
            let totalProductivity = 0;
            
            for (const member of workspaceMembersList) {
                const userTasks = wsTasks.filter(t => t.assigneeId === member.userId);
                const completed = userTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
                const score = completed > 0 ? Math.min(100, 65 + completed * 5) : 80;
                totalProductivity += score;
            }
            const teamProductivity = workspaceMembersList.length > 0 ? Math.round(totalProductivity / workspaceMembersList.length) : 85;

            // 3. AI Risk Score
            const delayedCount = wsTasks.filter(t => t.status !== 'done' && t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()).length;
            const highPriorityCount = wsTasks.filter(t => t.priority === 'critical' || t.priority === 'high').length;
            
            const delayRatio = totalTasks > 0 ? (delayedCount / totalTasks) : 0;
            const priorityRatio = totalTasks > 0 ? (highPriorityCount / totalTasks) : 0;
            const aiRiskScore = Math.min(100, Math.round((delayRatio * 60) + (priorityRatio * 40)));

            return res.status(200).json({
                projectHealth,
                teamProductivity,
                aiRiskScore,
                forecasts: {
                    delayDays: delayedCount > 0 ? Math.round(delayedCount * 1.5) : 0,
                    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100,
                    risksDetected: delayedCount + (highPriorityCount > 2 ? 1 : 0)
                }
            });
        } catch (error: any) {
            console.error('Error in getExecutiveStats controller:', error);
            return res.status(500).json({ message: error.message || 'AI Executive Dashboard fetch failed' });
        }
    }

    static async enterpriseCopilot(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { message, history } = req.body;
            const workspaceId = user.activeWorkspaceId;
            if (!workspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const reply = await EnterpriseAIService.askCopilot(message, history || [], user.id, user.role, workspaceId);
            return res.status(200).json({ reply });
        } catch (error: any) {
            console.error('Error in enterpriseCopilot:', error);
            return res.status(500).json({ message: error.message || 'Copilot failed' });
        }
    }

    static async detectBurnout(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { targetUserId } = req.body;
            const workspaceId = user.activeWorkspaceId;
            if (!workspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const result = await EnterpriseAIService.detectBurnout(targetUserId || user.id, user.id, user.role, workspaceId);
            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in detectBurnout:', error);
            return res.status(500).json({ message: error.message || 'Burnout detection failed' });
        }
    }

    static async detectTeamBurnout(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { projectId } = req.params;
            const workspaceId = user.activeWorkspaceId;
            if (!workspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const teamMembers = await db.select({ userId: projectMembers.userId })
                .from(projectMembers)
                .where(eq(projectMembers.projectId, Number(projectId)));

            const results = [];
            for (const member of teamMembers) {
                try {
                    const result = await EnterpriseAIService.detectBurnout(member.userId, user.id, user.role, workspaceId);
                    results.push(result);
                } catch (e) {
                    // ignore unauthorized/failures gracefully
                }
            }

            return res.status(200).json({ teamBurnout: results });
        } catch (error: any) {
            console.error('Error in detectTeamBurnout:', error);
            return res.status(500).json({ message: error.message || 'Team burnout detection failed' });
        }
    }

    static async getHealthScore(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { type, id } = req.params;
            const result = await EnterpriseAIService.getHealthScore(type as any, Number(id), user.id, user.role);
            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in getHealthScore:', error);
            return res.status(500).json({ message: error.message || 'Health score retrieval failed' });
        }
    }

    static async emailAssist(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { context, tone } = req.body;
            const result = await EnterpriseAIService.generateEmailDraft(context, tone, user.id, user.role);
            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in emailAssist:', error);
            return res.status(500).json({ message: error.message || 'Email assistance failed' });
        }
    }

    static async getWeeklyReport(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const workspaceId = user.activeWorkspaceId;
            if (!workspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const result = await EnterpriseAIService.generateWeeklyReport(user.id, user.role, workspaceId);
            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in getWeeklyReport:', error);
            return res.status(500).json({ message: error.message || 'Weekly report failed' });
        }
    }

    static async getRoleDashboard(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const workspaceId = user.activeWorkspaceId;
            if (!workspaceId) return res.status(400).json({ message: 'No active workspace selected' });

            const result = await EnterpriseAIService.getRoleDashboard(user.id, user.role, workspaceId);
            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in getRoleDashboard:', error);
            return res.status(500).json({ message: error.message || 'Role dashboard failed' });
        }
    }

    static async smartAssign(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { taskId } = req.params;
            const result = await ProjectIntelligenceService.getSmartAssignmentRecommendation(Number(taskId));
            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in smartAssign:', error);
            return res.status(500).json({ message: error.message || 'Smart assignment failed' });
        }
    }
}

