import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

// Configure multer in-memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    }
});

router.post('/', checkValiditi, upload.single('file'), UploadController.uploadFile);
router.delete('/:fileId', checkValiditi, UploadController.deleteFile);

export default router;
