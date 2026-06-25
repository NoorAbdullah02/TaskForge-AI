import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.post('/email', checkValiditi, ReportsController.emailReport);

export default router;
