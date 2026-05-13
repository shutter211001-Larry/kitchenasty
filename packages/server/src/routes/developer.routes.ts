import { Router } from 'express';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';
import { getMetrics, getEndpointMetrics, getAuditLogs, syncDatabase } from '../controllers/developer.controller.js';

const router = Router();

// MANAGER+ can view metrics
router.get('/metrics', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), getMetrics);
router.get('/metrics/endpoints', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), getEndpointMetrics);

// SUPER_ADMIN only for audit logs and sync
router.get('/audit-logs', authenticate, requireStaff, requireRole('SUPER_ADMIN'), getAuditLogs);
router.post('/sync-db', authenticate, requireStaff, requireRole('SUPER_ADMIN'), syncDatabase);

export default router;
