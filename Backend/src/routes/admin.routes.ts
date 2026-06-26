import { Router } from 'express';
import { checkValiditi } from '../middleware/checkValidUser';
import { requireAuth, requireRole } from '../middleware/rbac.middleware';
import {
    getSystemSettings,
    updateSystemSettings,
    getAdminDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getAdminUsers,
    updateUserRoleDept,
    getAuditLogs
} from '../controllers/adminController';

const router = Router();

// Apply auth middleware globally to admin routes
router.use(checkValiditi);
router.use(requireAuth);

// System settings routes
router.get('/settings', requireRole(['admin']), getSystemSettings);
router.put('/settings', requireRole(['admin']), updateSystemSettings);

// Department management routes
router.get('/departments', requireRole(['admin', 'manager']), getAdminDepartments);
router.post('/departments', requireRole(['admin']), createDepartment);
router.put('/departments/:id', requireRole(['admin']), updateDepartment);
router.delete('/departments/:id', requireRole(['admin']), deleteDepartment);

// User management routes
router.get('/users', requireRole(['admin', 'manager']), getAdminUsers);
router.put('/users/:id', requireRole(['admin']), updateUserRoleDept);

// Audit logs routes
router.get('/audit-logs', requireRole(['admin', 'manager']), getAuditLogs);

export default router;
