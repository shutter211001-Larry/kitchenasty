import { Router } from 'express';
import { getProfitAndLoss } from '../controllers/financeController';

const router = Router();

// GET /api/erp/finance/pnl
router.get('/pnl', getProfitAndLoss);

export default router;
