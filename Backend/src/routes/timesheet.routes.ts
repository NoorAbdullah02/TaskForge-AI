import { Router } from 'express';
import { TimesheetController } from '../controllers/timesheet.controller';
import { checkValiditi } from '../middleware/checkValidUser';
import { validate } from '../middleware/validation.middleware';
import { subscriptionGate } from '../middleware/subscriptionGate.middleware';
import { GenerateTimesheetSchema, ReviewTimesheetSchema } from '../validations/timesheet';

const router = Router();

router.use(checkValiditi);

// Employee-facing
router.post('/generate', subscriptionGate, validate(GenerateTimesheetSchema), TimesheetController.generate);
router.get('/mine', TimesheetController.listMine);
router.post('/:id/submit', subscriptionGate, TimesheetController.submit);
router.get('/:id/pdf', TimesheetController.downloadPdf);
router.get('/:id/excel', TimesheetController.downloadExcel);
router.get('/:id', TimesheetController.getOne);

// Manager-facing (owner/admin/manager/super_admin — enforced in controller)
router.get('/team/list', TimesheetController.listTeam);
router.post('/:id/approve', subscriptionGate, validate(ReviewTimesheetSchema), TimesheetController.approve);
router.post('/:id/reject', subscriptionGate, validate(ReviewTimesheetSchema), TimesheetController.reject);
router.post('/:id/lock', subscriptionGate, TimesheetController.setLock);

export default router;
