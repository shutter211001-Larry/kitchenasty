import { Router } from 'express';
import { issueOrderInvoice } from '../controllers/invoice.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Endpoint to manually trigger an invoice issue for an order
// e.g. POST /api/invoices/issue/:orderId
// We protect this route so only authenticated users (staff/admin) can trigger it manually for now
router.post('/issue/:orderId', requireAuth, issueOrderInvoice);

export default router;
