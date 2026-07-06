import { Router } from 'express';
import { TimeController } from '../controllers/time.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.use(checkValiditi);

router.get('/logs', TimeController.getLogs);
router.get('/active', TimeController.getActiveTimer);
router.post('/start', TimeController.startTimer);
router.post('/stop', TimeController.stopTimer);
router.post('/logs', TimeController.createManualLog);

export default router;
