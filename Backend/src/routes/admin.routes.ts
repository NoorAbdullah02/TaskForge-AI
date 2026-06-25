import { Router } from 'express';
import { checkValiditi } from '../middleware/checkValidUser';
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

// System settings routes
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// Department management routes
router.get('/departments', getAdminDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// User management routes
router.get('/users', getAdminUsers);
router.put('/users/:id', updateUserRoleDept);

// Audit logs routes
router.get('/audit-logs', getAuditLogs);

export default router;
