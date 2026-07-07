import { Router } from 'express';
import { checkValiditi } from '../middleware/checkValidUser';
import { WorkspaceController } from '../controllers/workspaceController';

const router = Router();

router.post('/create', WorkspaceController.createWorkspace);
router.post('/join', WorkspaceController.joinWorkspace);

router.use(checkValiditi);

router.get('/user-workspaces', WorkspaceController.getUserWorkspaces);
router.get('/info', WorkspaceController.getWorkspaceInfo);
router.get('/members', WorkspaceController.getWorkspaceMembers);
router.post('/switch', WorkspaceController.switchActiveWorkspace);
router.get('/requests', WorkspaceController.getPendingRequests);
router.post('/approve', WorkspaceController.approveMember);
router.post('/bulk-approve', WorkspaceController.bulkApproveMembers);
router.put('/settings', WorkspaceController.updateSettings);
router.post('/regenerate-invite', WorkspaceController.regenerateInvite);
router.post('/invite', WorkspaceController.inviteMembers);
router.post('/assign-pm', WorkspaceController.assignProjectManager);

export default router;
