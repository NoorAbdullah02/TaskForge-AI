import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { checkValiditi } from '../middleware/checkValidUser';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Strict rate limit for AI routes — prevents LLM API abuse & cost overruns
const aiLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  message: 'AI rate limit exceeded. Please wait before making more AI requests.'
});

router.post('/generate-tasks', checkValiditi, aiLimiter, AIController.generateTasks);
router.post('/summarize-meeting', checkValiditi, aiLimiter, AIController.summarizeMeeting);
router.post('/copilot', checkValiditi, aiLimiter, AIController.copilot);
router.post('/plan-sprint', checkValiditi, aiLimiter, AIController.planSprint);
router.post('/generate-docs', checkValiditi, aiLimiter, AIController.generateDocs);
router.post('/analyze-risks', checkValiditi, aiLimiter, AIController.analyzeRisks);
router.post('/weekly-summary', checkValiditi, aiLimiter, AIController.sendWeeklySummaryEmail);

// New AI & ML Sprint endpoints
router.post('/plan-sprint-v2', checkValiditi, aiLimiter, AIController.planSprintV2);
router.get('/resource-planner/:projectId', checkValiditi, aiLimiter, AIController.resourcePlanner);
router.get('/predict-deadline/:type/:id', checkValiditi, aiLimiter, AIController.predictDeadline);
router.get('/predict-project-success/:projectId', checkValiditi, aiLimiter, AIController.predictProjectSuccess);
router.get('/predict-productivity/:userId', checkValiditi, aiLimiter, AIController.predictProductivity);
router.get('/daily-standup', checkValiditi, aiLimiter, AIController.getDailyStandup);
router.get('/executive-stats', checkValiditi, aiLimiter, AIController.getExecutiveStats);

// Enterprise AI endpoints
router.post('/enterprise/copilot', checkValiditi, aiLimiter, AIController.enterpriseCopilot);
router.post('/enterprise/burnout-detect', checkValiditi, aiLimiter, AIController.detectBurnout);
router.get('/enterprise/burnout-team/:projectId', checkValiditi, aiLimiter, AIController.detectTeamBurnout);
router.get('/enterprise/health-score/:type/:id', checkValiditi, aiLimiter, AIController.getHealthScore);
router.post('/enterprise/email-assist', checkValiditi, aiLimiter, AIController.emailAssist);
router.get('/enterprise/weekly-report', checkValiditi, aiLimiter, AIController.getWeeklyReport);
router.get('/enterprise/smart-assign/:taskId', checkValiditi, aiLimiter, AIController.smartAssign);
router.get('/enterprise/role-dashboard', checkValiditi, aiLimiter, AIController.getRoleDashboard);

export default router;
