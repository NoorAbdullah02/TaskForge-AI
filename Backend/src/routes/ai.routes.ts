import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.post('/generate-tasks', checkValiditi, AIController.generateTasks);
router.post('/summarize-meeting', checkValiditi, AIController.summarizeMeeting);
router.post('/copilot', checkValiditi, AIController.copilot);
router.post('/plan-sprint', checkValiditi, AIController.planSprint);
router.post('/generate-docs', checkValiditi, AIController.generateDocs);
router.post('/analyze-risks', checkValiditi, AIController.analyzeRisks);
router.post('/weekly-summary', checkValiditi, AIController.sendWeeklySummaryEmail);

// New AI & ML Sprint endpoints
router.post('/plan-sprint-v2', checkValiditi, AIController.planSprintV2);
router.get('/resource-planner/:projectId', checkValiditi, AIController.resourcePlanner);
router.get('/predict-deadline/:type/:id', checkValiditi, AIController.predictDeadline);
router.get('/predict-project-success/:projectId', checkValiditi, AIController.predictProjectSuccess);
router.get('/predict-productivity/:userId', checkValiditi, AIController.predictProductivity);
router.get('/daily-standup', checkValiditi, AIController.getDailyStandup);
router.get('/executive-stats', checkValiditi, AIController.getExecutiveStats);

// Enterprise AI endpoints
router.post('/enterprise/copilot', checkValiditi, AIController.enterpriseCopilot);
router.post('/enterprise/burnout-detect', checkValiditi, AIController.detectBurnout);
router.get('/enterprise/burnout-team/:projectId', checkValiditi, AIController.detectTeamBurnout);
router.get('/enterprise/health-score/:type/:id', checkValiditi, AIController.getHealthScore);
router.post('/enterprise/email-assist', checkValiditi, AIController.emailAssist);
router.get('/enterprise/weekly-report', checkValiditi, AIController.getWeeklyReport);
router.get('/enterprise/smart-assign/:taskId', checkValiditi, AIController.smartAssign);
router.get('/enterprise/role-dashboard', checkValiditi, AIController.getRoleDashboard);

export default router;


