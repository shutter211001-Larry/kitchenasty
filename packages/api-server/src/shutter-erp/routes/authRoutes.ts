import { Router } from 'express';
import { register, login, getMe, getSetupStatus } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware as any, getMe as any);
router.get('/setup-status', getSetupStatus);

export default router;
