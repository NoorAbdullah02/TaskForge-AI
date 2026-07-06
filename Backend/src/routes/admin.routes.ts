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

// System settings routes — owners/admins manage; managers can view
const settingsViewRoles = ['admin', 'owner', 'super_admin', 'manager'];
const settingsManageRoles = ['admin', 'owner', 'super_admin'];
const adminViewRoles = ['admin', 'owner', 'super_admin', 'manager'];
const adminManageRoles = ['admin', 'owner', 'super_admin'];

router.get('/settings', requireRole(settingsViewRoles), getSystemSettings);
router.put('/settings', requireRole(settingsManageRoles), updateSystemSettings);

// Department management routes
router.get('/departments', requireRole(adminViewRoles), getAdminDepartments);
router.post('/departments', requireRole(adminManageRoles), createDepartment);
router.put('/departments/:id', requireRole(adminManageRoles), updateDepartment);
router.delete('/departments/:id', requireRole(adminManageRoles), deleteDepartment);

// User management routes
router.get('/users', requireRole(adminViewRoles), getAdminUsers);
router.put('/users/:id', requireRole(adminManageRoles), updateUserRoleDept);

// Audit logs routes
router.get('/audit-logs', requireRole(adminViewRoles), getAuditLogs);

export default router;
