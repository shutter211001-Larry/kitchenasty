import { Router } from 'express';
import { authenticate, optionalAuth, requireStaff, requireRole, requirePermission } from '../middleware/auth.js';
import multer from 'multer';
import { 
  createOrder, listOrders, listCustomerOrders, getOrder, 
  updateOrderStatus, deleteOrder, exportOrders, importOrders, 
  downloadOrderTemplate, checkOrderReminders, lookupOrder, claimOrder,
  cancelOrder
} from '../controllers/order.controller.js';
import { checkIPBlacklist, checkCustomerBlacklist, orderRateLimiter } from '../middleware/security.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Customer: cancel order (optionalAuth - allows guest cancellation if pending)
router.post('/:id/cancel', optionalAuth, checkIPBlacklist, checkCustomerBlacklist, cancelOrder);

// Customer creates order (optionalAuth - allows guest checkout)
router.post('/', optionalAuth, checkIPBlacklist, checkCustomerBlacklist, orderRateLimiter, createOrder);

// Lookup order by email/number (public)
router.get('/lookup', lookupOrder);

// Claim order to customer account (requires auth)
router.post('/:id/claim', authenticate, claimOrder);

// Customer: view own orders
router.get('/my-orders', authenticate, listCustomerOrders);

// Staff: list and manage orders
router.get('/', authenticate, requireStaff, listOrders);
router.get('/export', authenticate, requirePermission('EXPORT_DATA', ['SUPER_ADMIN', 'MANAGER']), exportOrders);
router.get('/template', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), downloadOrderTemplate);
router.post('/import', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), upload.single('file'), importOrders);
router.get('/:id', optionalAuth, getOrder);
router.patch('/:id/status', authenticate, requirePermission('MANAGE_ORDERS', ['SUPER_ADMIN', 'MANAGER', 'STAFF']), updateOrderStatus);
router.post('/reminders', authenticate, requireStaff, checkOrderReminders);
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), deleteOrder);

export default router;
