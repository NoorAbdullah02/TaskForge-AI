import { Router } from 'express';
import { checkValiditi } from '../middleware/checkValidUser';
import { WorkspaceController } from '../controllers/workspaceController';

const router = Router();

// Public routes for workspace onboarding
router.post('/create', WorkspaceController.createWorkspace);
router.post('/join', WorkspaceController.joinWorkspace);

// Authenticated routes
router.use(checkValiditi);

router.get('/user-workspaces', WorkspaceController.getUserWorkspaces);
router.post('/switch', WorkspaceController.switchActiveWorkspace);
router.get('/requests', WorkspaceController.getPendingRequests);
router.post('/approve', WorkspaceController.approveMember);
router.put('/settings', WorkspaceController.updateSettings);
router.post('/regenerate-invite', WorkspaceController.regenerateInvite);

export default router;
