import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.post('/generate-tasks', checkValiditi, AIController.generateTasks);
router.post('/summarize-meeting', checkValiditi, AIController.summarizeMeeting);
router.post('/copilot', checkValiditi, AIController.copilot);

export default router;
