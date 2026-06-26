import { Router } from 'express';
import { KbController } from '../controllers/kb.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.use(checkValiditi);

router.get('/pages', KbController.getPages);
router.post('/pages', KbController.createPage);
router.put('/pages/:id', KbController.updatePage);
router.delete('/pages/:id', KbController.deletePage);

export default router;
