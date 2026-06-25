import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

// Tasks REST API
router.get('/', checkValiditi, TaskController.getUserTasks);
router.post('/', checkValiditi, TaskController.createTask);

router.get('/:id', checkValiditi, TaskController.getTaskDetails);
router.put('/:id', checkValiditi, TaskController.updateTask);
router.delete('/:id', checkValiditi, TaskController.deleteTask);

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
