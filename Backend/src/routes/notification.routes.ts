import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

// Preferences routes (placed above dynamic :id route to avoid conflict)
router.get('/preferences', checkValiditi, NotificationController.getPreferences);
router.patch('/preferences', checkValiditi, NotificationController.updatePreferences);

// Logs routes (placed above dynamic :id route to avoid conflict)
router.get('/email-logs', checkValiditi, NotificationController.getEmailLogs);
router.patch('/email-logs/:id/retry', checkValiditi, NotificationController.retryEmailLog);
router.get('/automation-logs', checkValiditi, NotificationController.getAutomationLogs);

// Notifications CRUD — static routes MUST come before dynamic /:id
router.get('/', checkValiditi, NotificationController.getNotifications);
router.patch('/read-all', checkValiditi, NotificationController.markAllRead);
router.delete('/clear-all', checkValiditi, NotificationController.clearAll);
router.patch('/:id/read', checkValiditi, NotificationController.markAsRead);
router.patch('/:id/archive', checkValiditi, NotificationController.archiveNotification);
router.delete('/:id', checkValiditi, NotificationController.deleteNotification);

export default router;
