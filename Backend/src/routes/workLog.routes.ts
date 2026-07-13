import { Router } from 'express';
import { WorkLogController } from '../controllers/workLog.controller';
import { checkValiditi } from '../middleware/checkValidUser';
import { validate } from '../middleware/validation.middleware';
import { subscriptionGate } from '../middleware/subscriptionGate.middleware';
import { SubmitWorkLogSchema, UpdateWorkLogSchema, ReviewWorkLogSchema, BulkApproveWorkLogSchema } from '../validations/workLog';

const router = Router();

router.use(checkValiditi);

// Employee-facing
router.post('/', subscriptionGate, validate(SubmitWorkLogSchema), WorkLogController.submit);
router.get('/mine', WorkLogController.listMine);
router.put('/:id', subscriptionGate, validate(UpdateWorkLogSchema), WorkLogController.update);
router.get('/:id', WorkLogController.getOne);

// Manager-facing (owner/admin/manager/super_admin — enforced in controller)
router.get('/team/list', WorkLogController.listTeam);
router.get('/team/analytics', WorkLogController.getAnalytics);
router.post('/:id/approve', subscriptionGate, validate(ReviewWorkLogSchema), WorkLogController.approve);
router.post('/:id/reject', subscriptionGate, validate(ReviewWorkLogSchema), WorkLogController.reject);
router.post('/:id/request-changes', subscriptionGate, validate(ReviewWorkLogSchema), WorkLogController.requestChanges);
router.post('/bulk-approve', subscriptionGate, validate(BulkApproveWorkLogSchema), WorkLogController.bulkApprove);

export default router;
