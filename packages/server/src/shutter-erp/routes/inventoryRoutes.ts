import { Router } from 'express';
import { getInventoryLogs, createInventoryLog } from '../controllers/inventoryController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/logs', authMiddleware as any, getInventoryLogs as any);
router.post('/log', authMiddleware as any, createInventoryLog as any);

export default router;
