import { Request, Response } from 'express';
import { ProjectIntelligenceService } from '../services/projectIntelligence.service';
import { db } from '../db/index';
import { taskDependencies, tasks } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class ProjectIntelligenceController {
    
    // SMART TASK ASSIGNMENT RECOMMENDATION
    static async recommendAssignee(req: Request, res: Response): Promise<void> {
        try {
            const { taskId } = req.body;
            if (!taskId) {
                res.status(400).json({ error: "Task ID is required." });
                return;
            }
            const recommendation = await ProjectIntelligenceService.getSmartAssignmentRecommendation(Number(taskId));
            res.json(recommendation);
        } catch (err: any) {
            console.error('Error recommending assignee:', err);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    }

    // TASK HEALTH SCORE
    static async getTaskHealth(req: Request, res: Response): Promise<void> {
        try {
            const { taskId } = req.params;
            if (!taskId) {
                res.status(400).json({ error: "Task ID is required." });
                return;
            }
            const health = await ProjectIntelligenceService.calculateTaskHealthScore(Number(taskId));
            res.json(health);
        } catch (err: any) {
            console.error('Error calculating task health:', err);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    }

    // DEPENDENCY CRUD & VALIDATION
    static async getProjectDependencies(req: Request, res: Response): Promise<void> {
        try {
            const { projectId } = req.params;
            if (!projectId) {
                res.status(400).json({ error: "Project ID is required." });
                return;
            }
            // Fetch all dependencies for this project
            const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, Number(projectId)));
            const taskIds = projectTasks.map(t => t.id);

            let dependenciesList: any[] = [];
            if (taskIds.length > 0) {
                // Fetch the actual dependencies join tasks
                dependenciesList = await db.select({
                    id: taskDependencies.id,
                    taskId: taskDependencies.taskId,
                    dependsOnTaskId: taskDependencies.dependsOnTaskId,
                    dependencyType: taskDependencies.dependencyType,
                    createdAt: taskDependencies.createdAt
                })
                .from(taskDependencies)
                .where(eq(taskDependencies.taskId, taskIds[0])); // Fetch for first task or map properly
                
                // Let's do a clean query for all dependencies where taskId is in project's task list
                // To support inArray safely
                dependenciesList = await db.select({
                    id: taskDependencies.id,
                    taskId: taskDependencies.taskId,
                    dependsOnTaskId: taskDependencies.dependsOnTaskId,
                    dependencyType: taskDependencies.dependencyType,
                    createdAt: taskDependencies.createdAt
                })
                .from(taskDependencies);
                
                // Filter memory side to be precise and robust
                dependenciesList = dependenciesList.filter(d => taskIds.includes(d.taskId));
            }

            const risks = await ProjectIntelligenceService.validateDependencies(Number(projectId));
            res.json({
                dependencies: dependenciesList,
                risks
            });
        } catch (err: any) {
            console.error('Error fetching project dependencies:', err);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    }

    static async addDependency(req: Request, res: Response): Promise<void> {
        try {
            const { taskId, dependsOnTaskId, dependencyType } = req.body;
            if (!taskId || !dependsOnTaskId) {
                res.status(400).json({ error: "taskId and dependsOnTaskId are required." });
                return;
            }

            if (Number(taskId) === Number(dependsOnTaskId)) {
                res.status(400).json({ error: "A task cannot depend on itself." });
                return;
            }

            // Check if already exists
            const existing = await db.select().from(taskDependencies)
                .where(
                    and(
                        eq(taskDependencies.taskId, Number(taskId)),
                        eq(taskDependencies.dependsOnTaskId, Number(dependsOnTaskId))
                    )
                );
            
            if (existing.length > 0) {
                res.status(400).json({ error: "Dependency relationship already exists." });
                return;
            }

            const [newDep] = await db.insert(taskDependencies).values({
                taskId: Number(taskId),
                dependsOnTaskId: Number(dependsOnTaskId),
                dependencyType: dependencyType || 'FS'
            }).returning();

            res.status(201).json(newDep);
        } catch (err: any) {
            console.error('Error adding dependency:', err);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    }

    static async deleteDependency(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: "Dependency ID is required." });
                return;
            }
            await db.delete(taskDependencies).where(eq(taskDependencies.id, Number(id)));
            res.json({ success: true, message: "Dependency deleted successfully." });
        } catch (err: any) {
            console.error('Error deleting dependency:', err);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    }

    // WORKLOAD BALANCER
    static async getWorkloadBalancer(req: Request, res: Response): Promise<void> {
        try {
            const { projectId } = req.params;
            if (!projectId) {
                res.status(400).json({ error: "Project ID is required." });
                return;
            }
            const workload = await ProjectIntelligenceService.getWorkloadBalancer(Number(projectId));
            res.json(workload);
        } catch (err: any) {
            console.error('Error fetching workload data:', err);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    }

    // BURNOUT SCANNER
    static async getBurnoutRisk(req: Request, res: Response): Promise<void> {
        try {
            const { workspaceId } = req.params;
            if (!workspaceId) {
                res.status(400).json({ error: "Workspace ID is required." });
                return;
            }
            const burnout = await ProjectIntelligenceService.getBurnoutRisk(Number(workspaceId));
            res.json(burnout);
        } catch (err: any) {
            console.error('Error scanning burnout risks:', err);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    }

    // PROJECT HEALTH DASHBOARD OVERVIEW
    static async getProjectHealth(req: Request, res: Response): Promise<void> {
        try {
            const { projectId } = req.params;
            if (!projectId) {
                res.status(400).json({ error: "Project ID is required." });
                return;
            }
            const healthOverview = await ProjectIntelligenceService.getProjectHealthOverview(Number(projectId));
            res.json(healthOverview);
        } catch (err: any) {
            console.error('Error generating project health overview:', err);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    }

    // MANUAL ESCALATION TRIGGER FOR TESTING
    static async triggerEscalationCheck(req: Request, res: Response): Promise<void> {
        try {
            const { runEscalationCheck } = require('../services/escalation.scheduler');
            await runEscalationCheck();
            res.json({ success: true, message: "Escalation scan executed successfully." });
        } catch (err: any) {
            console.error('Error triggering escalation scan manually:', err);
            res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    }
}
