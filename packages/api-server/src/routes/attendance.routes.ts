import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getMyRecords,
  getRecords,
  getQrToken,
} from '../controllers/attendance.controller.js';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';

const router = Router();

// QR Token Endpoint
router.get('/qr-token', authenticate, requireStaff, getQrToken);

// Staff endpoints
router.post('/check-in', authenticate, requireStaff, checkIn);
router.post('/check-out/:id', authenticate, requireStaff, checkOut);
router.get('/my-records', authenticate, requireStaff, getMyRecords);

// Admin endpoints
router.get('/records', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), getRecords);

export default router;
