import { Router } from 'express';
import { register, login, getMe, getSetupStatus, updateLanguage } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware as any, getMe as any);
router.get('/setup-status', getSetupStatus);
router.patch('/me/language', authMiddleware as any, updateLanguage as any);

export default router;
