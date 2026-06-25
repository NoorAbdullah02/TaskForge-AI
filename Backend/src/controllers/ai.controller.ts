import type { Request, Response } from 'express';
import { db } from '../db/index';
import { aiRequests } from '../db/schema';
import { generateJSONResponse, generateTextResponse } from '../lib/gemini';
import { ProjectService } from '../services/project.service';
import { TaskService } from '../services/task.service';

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
}
