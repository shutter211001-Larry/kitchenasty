import { Router } from 'express';
import { register, login, getMe, getSetupStatus, updateLanguage, validateInviteToken, acceptInvite, requestPasswordReset, resetPassword } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware as any, getMe as any);
router.get('/setup-status', getSetupStatus);
router.patch('/me/language', authMiddleware as any, updateLanguage as any);

router.get('/invite/:token', validateInviteToken as any);
router.post('/accept-invite', acceptInvite as any);

router.post('/forgot-password', requestPasswordReset as any);
router.post('/reset-password', resetPassword as any);

export default router;
