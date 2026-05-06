import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  sendPromotionalEmail,
} from '../controllers/customer.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All customer routes require staff authentication
router.use(authenticate);
router.use(requireRole(['SUPER_ADMIN', 'MANAGER']));

router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/promo-email', sendPromotionalEmail);

export default router;
