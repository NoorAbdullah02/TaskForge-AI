import { Router } from 'express';
import { ProjectIntelligenceController } from '../controllers/projectIntelligence.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.post('/recommend-assignee', checkValiditi, ProjectIntelligenceController.recommendAssignee);
router.get('/tasks/:taskId/health', checkValiditi, ProjectIntelligenceController.getTaskHealth);
router.get('/projects/:projectId/dependencies', checkValiditi, ProjectIntelligenceController.getProjectDependencies);
router.post('/dependencies', checkValiditi, ProjectIntelligenceController.addDependency);
router.delete('/dependencies/:id', checkValiditi, ProjectIntelligenceController.deleteDependency);
router.get('/projects/:projectId/workload', checkValiditi, ProjectIntelligenceController.getWorkloadBalancer);
router.get('/workspaces/:workspaceId/burnout', checkValiditi, ProjectIntelligenceController.getBurnoutRisk);
router.get('/projects/:projectId/health', checkValiditi, ProjectIntelligenceController.getProjectHealth);
router.post('/escalation/run-check', checkValiditi, ProjectIntelligenceController.triggerEscalationCheck);

export default router;
