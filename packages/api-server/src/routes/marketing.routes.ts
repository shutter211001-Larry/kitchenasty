import { Router } from 'express';
import { getMarketingStats } from '../controllers/marketing.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// 只需要 MANAGER 或 SUPER_ADMIN 權限
router.get('/stats', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), getMarketingStats);

export default router;
