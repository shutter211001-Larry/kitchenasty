import { Router } from 'express';
import { getExpenses, updateExpenseStatus, deleteExpense } from '../controllers/expenseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/', getExpenses as any);
router.patch('/:id/status', updateExpenseStatus as any);
router.delete('/:id', deleteExpense as any);

export default router;
