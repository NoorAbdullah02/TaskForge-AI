import { Router } from 'express';
import { TimeController } from '../controllers/time.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.use(checkValiditi);

router.get('/logs', TimeController.getLogs);
router.get('/active', TimeController.getActiveTimer);
router.post('/start', TimeController.startTimer);
router.post('/pause', TimeController.pauseTimer);
router.post('/resume', TimeController.resumeTimer);
router.post('/stop', TimeController.stopTimer);
router.post('/restart/:id', TimeController.restartTimer);
router.post('/logs', TimeController.createManualLog);

router.get('/hours/me', TimeController.getMyHoursSummary);
router.get('/hours/workspace', TimeController.getWorkspaceHours);
router.get('/hours/projects', TimeController.getProjectHours);

export default router;
