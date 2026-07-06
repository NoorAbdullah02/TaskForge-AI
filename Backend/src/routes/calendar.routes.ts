import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.use(checkValiditi);

router.get('/events', CalendarController.getEvents);
router.post('/meetings', CalendarController.scheduleMeeting);

export default router;
