import type { Request, Response } from 'express';
import { db } from '../db/index';
import { aiRequests, projects, tasks, attendance } from '../db/schema';
import { generateJSONResponse, generateTextResponse } from '../lib/gemini';
import { ProjectService } from '../services/project.service';
import { TaskService } from '../services/task.service';
import { eq, inArray } from 'drizzle-orm';
import { EmailTriggerService } from '../services/emailTrigger.service';

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

            const prompt = `You are an expert AI productivity assistant. Analyze the following meeting notes and generate a summary along with key action items.
Meeting Notes:
"${meetingNotes}"

Respond ONLY with a JSON object.
Do not include any markdown formatting, prefix or suffix like \`\`\`json. Return only the raw JSON.
JSON structure:
{
  "summary": "High-level summary of the meeting goals, topics discussed, and final outcomes (1-2 paragraphs).",
  "actionItems": [
    {
      "task": "Specific task to perform, e.g., Prepare financial spreadsheet",
      "assigneeHint": "Name of person suggested or implied for this task, or 'Unassigned' if none"
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
            const projectsList = await ProjectService.getUserProjects(user.id);
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
}
