import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.get('/stats', checkValiditi, DashboardController.getStats);

export default router;
