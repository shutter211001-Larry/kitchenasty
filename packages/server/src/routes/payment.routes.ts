import { Router } from 'express';
import express from 'express';
import { optionalAuth, authenticate, requireStaff } from '../middleware/auth.js';
import { 
  createPaymentIntent, 
  handleWebhook, 
  markCashPayment, 
  createPayPalPayment, 
  capturePayPalPayment,
  createLinePayPayment,
  confirmLinePayPayment
} from '../controllers/payment.controller.js';

const router = Router();

// Stripe webhook needs raw body
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Create payment intent (customer or guest)
router.post('/create-intent', optionalAuth, createPaymentIntent);

// Mark cash payment (staff only)
router.post('/cash', authenticate, requireStaff, markCashPayment);

// PayPal
router.post('/paypal/create', optionalAuth, createPayPalPayment);
router.post('/paypal/capture', optionalAuth, capturePayPalPayment);

// LINE Pay
router.post('/linepay/create', optionalAuth, createLinePayPayment);
router.post('/linepay/confirm', optionalAuth, confirmLinePayPayment);

export default router;
