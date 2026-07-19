import { Router } from 'express';
import { authenticate, optionalAuth, requireStaff, requireRole, requirePermission } from '../middleware/auth.js';
import { recoverTenantContext } from '../middleware/tenantMiddleware.js';
import multer from 'multer';
import { 
  createOrder, listOrders, listCustomerOrders, getOrder, 
  updateOrderStatus, deleteOrder, exportOrders, importOrders, 
  downloadOrderTemplate, checkOrderReminders, lookupOrder, claimOrder,
  cancelOrder, updateOrderDiscount, updateOrderPaymentStatus, addOrderPayment, calculateOrderSummary,
  submitBankTransferDetails, confirmBankTransfer
} from '../controllers/order.controller.js';
import { checkIPBlacklist, checkCustomerBlacklist, orderRateLimiter } from '../middleware/security.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Customer: cancel order (optionalAuth - allows guest cancellation if pending)
router.post('/:id/cancel', optionalAuth, checkIPBlacklist, checkCustomerBlacklist, cancelOrder);

// Customer creates order (optionalAuth - allows guest checkout)
router.post('/', optionalAuth, checkIPBlacklist, checkCustomerBlacklist, orderRateLimiter, createOrder);

// Calculate order summary (public, for checkout UI)
router.post('/summary', optionalAuth, checkIPBlacklist, calculateOrderSummary);

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
router.post('/import', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), upload.single('file'), recoverTenantContext, importOrders);
router.get('/:id', optionalAuth, getOrder);
router.patch('/:id/status', authenticate, requirePermission('MANAGE_ORDERS', ['SUPER_ADMIN', 'MANAGER', 'STAFF']), updateOrderStatus);
router.patch('/:id/payment-status', authenticate, requirePermission('MANAGE_ORDERS', ['SUPER_ADMIN', 'MANAGER', 'STAFF']), updateOrderPaymentStatus);
router.post('/:id/payments', authenticate, requirePermission('MANAGE_ORDERS', ['SUPER_ADMIN', 'MANAGER', 'STAFF']), addOrderPayment);
router.patch('/:id/discount', authenticate, requirePermission('MANAGE_ORDERS', ['SUPER_ADMIN', 'MANAGER']), updateOrderDiscount);
router.post('/:id/bank-transfer', optionalAuth, checkIPBlacklist, checkCustomerBlacklist, submitBankTransferDetails);
router.post('/:id/confirm-payment', authenticate, requirePermission('MANAGE_ORDERS', ['SUPER_ADMIN', 'MANAGER', 'STAFF']), confirmBankTransfer);
router.post('/reminders', authenticate, requireStaff, checkOrderReminders);
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), deleteOrder);

export default router;
