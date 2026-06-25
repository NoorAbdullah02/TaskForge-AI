import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

// Attendance endpoints protected by auth middleware
router.get('/today', checkValiditi, AttendanceController.getTodayStatus);
router.post('/check-in', checkValiditi, AttendanceController.checkIn);
router.post('/check-out', checkValiditi, AttendanceController.checkOut);
router.get('/history', checkValiditi, AttendanceController.getHistory);
router.get('/report', checkValiditi, AttendanceController.getMonthlyReport);

export default router;
