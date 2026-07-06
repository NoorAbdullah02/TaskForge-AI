import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

// Leaves endpoints protected by authentication middleware
router.post('/', checkValiditi, LeaveController.applyLeave);
router.get('/history', checkValiditi, LeaveController.getHistory);
router.get('/requests', checkValiditi, LeaveController.getRequests);
router.patch('/:id/approve', checkValiditi, LeaveController.approveLeave);
router.patch('/:id/reject', checkValiditi, LeaveController.rejectLeave);

export default router;
