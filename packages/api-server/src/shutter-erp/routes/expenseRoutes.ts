import { Router } from 'express';
import { getExpenses, updateExpenseStatus, deleteExpense, getExpenseAnalytics } from '../controllers/expenseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/analytics', getExpenseAnalytics as any);
router.get('/', getExpenses as any);
router.patch('/:id/status', updateExpenseStatus as any);
router.delete('/:id', deleteExpense as any);

export default router;
