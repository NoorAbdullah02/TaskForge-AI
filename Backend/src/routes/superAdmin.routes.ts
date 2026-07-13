import { Router, Request, Response, NextFunction } from 'express';
import { checkValiditi } from '../middleware/checkValidUser';
import { SuperAdminController } from '../controllers/superAdminController';
import * as queries from '../db/queries';

const router = Router();

// Auth validation middleware
router.use(checkValiditi);

// Super admin role verification middleware
async function verifySuperAdmin(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    // Look up role in db for security verification
    const fullUser = await queries.findUserById(user.id);
    if (!fullUser || fullUser.role !== 'super_admin') {
        return res.status(403).json({ message: 'Forbidden: Super Admin access required' });
    }
    next();
}

router.use(verifySuperAdmin);

// Super Admin Management Endpoints
router.get('/workspaces', SuperAdminController.getWorkspaces);
router.post('/workspaces/:id/suspend', SuperAdminController.toggleSuspendWorkspace);
router.post('/workspaces/:id/reset', SuperAdminController.resetWorkspace);
router.delete('/workspaces/:id', SuperAdminController.deleteWorkspace);
router.get('/users', SuperAdminController.getUsers);
router.post('/users/:id/ban', SuperAdminController.toggleBanUser);
router.get('/projects', SuperAdminController.getProjects);
router.get('/analytics', SuperAdminController.getAnalytics);
router.get('/audit-logs', SuperAdminController.getAuditLogs);

// Billing / Payment Management Endpoints
router.get('/payments', SuperAdminController.getPayments);
router.post('/payments/:id/approve', SuperAdminController.approvePayment);
router.post('/payments/:id/reject', SuperAdminController.rejectPayment);
router.post('/payments/bulk-approve', SuperAdminController.bulkApprovePayments);
router.post('/payments/bulk-reject', SuperAdminController.bulkRejectPayments);
router.get('/billing-analytics', SuperAdminController.getBillingAnalytics);


export default router;
