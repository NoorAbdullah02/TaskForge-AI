import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { checkValiditi } from '../middleware/checkValidUser';
import { subscriptionGate } from '../middleware/subscriptionGate.middleware';

const router = Router();

router.get('/export', checkValiditi, ProjectController.exportProjects);
router.post('/import', checkValiditi, ProjectController.importProjects);
router.post('/join', checkValiditi, ProjectController.joinProject);

router.get('/', checkValiditi, ProjectController.getUserProjects);
router.post('/', checkValiditi, subscriptionGate, ProjectController.createProject);

router.get('/:id', checkValiditi, ProjectController.getProjectDetails);
router.put('/:id', checkValiditi, ProjectController.updateProject);
router.delete('/:id', checkValiditi, ProjectController.deleteProject);

router.put('/:id/archive', checkValiditi, ProjectController.archiveProject);
router.put('/:id/restore', checkValiditi, ProjectController.restoreProject);
router.post('/:id/duplicate', checkValiditi, ProjectController.duplicateProject);
router.put('/:id/move', checkValiditi, ProjectController.moveProject);
router.put('/:id/transfer-ownership', checkValiditi, ProjectController.transferOwnership);

router.post('/:id/members', checkValiditi, ProjectController.assignMember);
router.delete('/:id/members/:userId', checkValiditi, ProjectController.removeMember);

router.post('/:id/tasks', checkValiditi, ProjectController.createTask);
router.put('/:id/tasks/:taskId', checkValiditi, ProjectController.updateTask);
router.delete('/:id/tasks/:taskId', checkValiditi, ProjectController.deleteTask);

router.get('/:id/documents', checkValiditi, ProjectController.getProjectDocuments);
router.post('/:id/documents', checkValiditi, ProjectController.addProjectDocument);
router.delete('/:id/documents/:docId', checkValiditi, ProjectController.deleteProjectDocument);

export default router;
