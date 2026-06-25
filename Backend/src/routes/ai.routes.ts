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

export default router;
