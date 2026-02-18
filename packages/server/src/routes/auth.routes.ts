import { Router } from 'express';
import {
  staffLogin,
  staffRegister,
  customerRegister,
  customerLogin,
  getMe,
} from '../controllers/auth.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Staff auth
router.post('/staff/login', staffLogin);
router.post('/staff/register', authenticate, requireRole('SUPER_ADMIN'), staffRegister);

// Customer auth
router.post('/customer/register', customerRegister);
router.post('/customer/login', customerLogin);

// Current user info
router.get('/me', authenticate, getMe);

export default router;
