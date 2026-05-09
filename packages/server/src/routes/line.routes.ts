import { Router } from 'express';
import { handleWebhook, bindLine, unbindLine, getLineStatus, lineLogin } from '../controllers/line.controller.js';
import { authenticate, requireStaff } from '../middleware/auth.js';

const router = Router();

// Status for admin
router.get('/status', authenticate, requireStaff, getLineStatus);

// Public webhook
router.post('/webhook', handleWebhook);

// Public login
router.post('/login', lineLogin);

// Protected binding
router.post('/bind', authenticate, bindLine);
router.post('/unbind', authenticate, unbindLine);

export default router;
