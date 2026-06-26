import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

// Bulk operations
router.post('/bulk-update', checkValiditi, TaskController.bulkUpdate);
router.post('/bulk-delete', checkValiditi, TaskController.bulkDelete);

// Templates routes
router.get('/templates', checkValiditi, TaskController.getTemplates);
router.post('/templates', checkValiditi, TaskController.createTemplate);
router.post('/templates/:templateId/apply', checkValiditi, TaskController.applyTemplate);

// Tasks REST API
router.get('/', checkValiditi, TaskController.getUserTasks);
router.post('/', checkValiditi, TaskController.createTask);

router.get('/:id', checkValiditi, TaskController.getTaskDetails);
router.put('/:id', checkValiditi, TaskController.updateTask);
router.delete('/:id', checkValiditi, TaskController.deleteTask);

router.put('/:id/approve', checkValiditi, TaskController.approveTask);
router.put('/:id/reject', checkValiditi, TaskController.rejectTask);

// Single task operations
router.put('/:id/lock', checkValiditi, TaskController.lockTask);
router.put('/:id/unlock', checkValiditi, TaskController.unlockTask);

router.post('/:id/watch', checkValiditi, TaskController.watchTask);
router.post('/:id/unwatch', checkValiditi, TaskController.unwatchTask);

router.post('/:id/archive', checkValiditi, TaskController.archiveTask);
router.post('/:id/restore', checkValiditi, TaskController.restoreTask);

router.post('/:id/duplicate', checkValiditi, TaskController.duplicateTask);

router.post('/:id/timer/start', checkValiditi, TaskController.startTimer);
router.post('/:id/timer/stop', checkValiditi, TaskController.stopTimer);

router.post('/:id/pomodoro/start', checkValiditi, TaskController.startPomodoro);
router.post('/:id/pomodoro/stop', checkValiditi, TaskController.stopPomodoro);

router.post('/:id/undo', checkValiditi, TaskController.undoChange);
router.post('/:id/redo', checkValiditi, TaskController.redoChange);

router.get('/:id/ai-scores', checkValiditi, TaskController.getTaskAIScores);

// Checklist (Subtasks) routes
router.post('/:id/subtasks', checkValiditi, TaskController.createSubtask);
router.put('/:id/subtasks/:subtaskId', checkValiditi, TaskController.updateSubtask);
router.delete('/:id/subtasks/:subtaskId', checkValiditi, TaskController.deleteSubtask);

// Comments routes
router.post('/:id/comments', checkValiditi, TaskController.createComment);
router.delete('/:id/comments/:commentId', checkValiditi, TaskController.deleteComment);

// Attachments routes
router.post('/:id/attachments', checkValiditi, TaskController.createAttachment);
router.delete('/:id/attachments/:attachmentId', checkValiditi, TaskController.deleteAttachment);

export default router;
