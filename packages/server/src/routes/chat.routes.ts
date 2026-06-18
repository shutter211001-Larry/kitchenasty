import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { getMessages, sendMessage } from '../controllers/chat.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireStaff);

router.get('/messages', getMessages);
router.post('/messages', sendMessage);

export default router;
