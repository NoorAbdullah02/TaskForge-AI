import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

// Projects REST API
router.get('/', checkValiditi, ProjectController.getUserProjects);
router.post('/', checkValiditi, ProjectController.createProject);

router.get('/:id', checkValiditi, ProjectController.getProjectDetails);
router.put('/:id', checkValiditi, ProjectController.updateProject);
router.delete('/:id', checkValiditi, ProjectController.deleteProject);

// Members Management
router.post('/:id/members', checkValiditi, ProjectController.assignMember);
router.delete('/:id/members/:userId', checkValiditi, ProjectController.removeMember);

// Tasks & Milestones Management inside a Project
router.post('/:id/tasks', checkValiditi, ProjectController.createTask);
router.put('/:id/tasks/:taskId', checkValiditi, ProjectController.updateTask);
router.delete('/:id/tasks/:taskId', checkValiditi, ProjectController.deleteTask);

export default router;
