import { Router } from 'express';
import { checkValiditi } from '../middleware/checkValidUser';
import { 
    getTeams, createTeam, updateTeam, deleteTeam, 
    getTeamMembers, addTeamMember, removeTeamMember 
} from '../controllers/teamController';
import { getSprints, createSprint, updateSprint, deleteSprint, startSprint, completeSprint } from '../controllers/sprintController';
import { getEpics, createEpic, updateEpic, deleteEpic } from '../controllers/epicController';
import { getStories, createStory, updateStory, deleteStory } from '../controllers/storyController';

const router = Router();

// Apply auth middleware globally to agile routes
router.use(checkValiditi);

router.get('/teams', getTeams);
router.post('/teams', createTeam);
router.put('/teams/:id', updateTeam);
router.delete('/teams/:id', deleteTeam);
router.get('/teams/:id/members', getTeamMembers);
router.post('/teams/:id/members/add', addTeamMember);
router.post('/teams/:id/members/remove', removeTeamMember);

router.get('/sprints', getSprints);
router.post('/sprints', createSprint);
router.put('/sprints/:id', updateSprint);
router.delete('/sprints/:id', deleteSprint);
router.put('/sprints/:id/start', startSprint);
router.put('/sprints/:id/complete', completeSprint);

router.get('/epics', getEpics);
router.post('/epics', createEpic);
router.put('/epics/:id', updateEpic);
router.delete('/epics/:id', deleteEpic);

router.get('/stories', getStories);
router.post('/stories', createStory);
router.put('/stories/:id', updateStory);
router.delete('/stories/:id', deleteStory);

export default router;
