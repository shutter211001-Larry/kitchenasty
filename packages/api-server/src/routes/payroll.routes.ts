import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { listPayrollPeriods, createPayrollPeriod, generatePayslips, getPayslips, getPayslip } from '../controllers/payroll.controller.js';

const router = Router();

// Only managers and super admins can access payroll
router.use(authenticate);
router.use(requireRole('MANAGER', 'SUPER_ADMIN'));

router.get('/periods', listPayrollPeriods);
router.post('/periods', createPayrollPeriod);
router.post('/periods/:id/generate', generatePayslips);
router.get('/periods/:id/payslips', getPayslips);
router.get('/payslips/:id', getPayslip);

export default router;
