import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { checkValiditi } from '../middleware/checkValidUser';

const router = Router();

router.use(checkValiditi);

router.get('/rooms', ChatController.getRooms);
router.post('/rooms', ChatController.createRoom);
router.get('/rooms/:id/messages', ChatController.getMessages);
router.post('/rooms/:id/messages', ChatController.sendMessage);

export default router;
