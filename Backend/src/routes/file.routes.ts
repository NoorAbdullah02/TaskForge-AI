import { Router } from 'express';
import { FileController } from '../controllers/file.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.use(checkValiditi);

router.get('/:id/versions', FileController.getVersions);
router.post('/:id/versions', FileController.addVersion);
router.post('/:id/downloads', FileController.trackDownload);
router.get('/:id/downloads', FileController.getDownloads);

export default router;
