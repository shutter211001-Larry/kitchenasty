import { Router } from 'express';
import { getExpenses, updateExpenseStatus } from '../controllers/expenseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/', getExpenses as any);
router.patch('/:id/status', updateExpenseStatus as any);

export default router;
