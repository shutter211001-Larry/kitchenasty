import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { getDashboardStats } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/stats', authenticate, requireStaff, getDashboardStats);

export default router;
