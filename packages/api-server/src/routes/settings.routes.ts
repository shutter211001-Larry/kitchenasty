import { Router } from 'express';
import { authenticate, requireStaff, requireRole, requirePermission } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import prisma from '../lib/db.js';
import {
  getSettings,
  updateSettings,
  uploadLogo,
  uploadFavicon,
  uploadHeroBackground,
  getGeneralSettings,
  updateGeneralSettings,
  getOrderSettings,
  updateOrderSettings,
  getReservationSettings,
  updateReservationSettings,
  getMailSettings,
  updateMailSettings,
  sendTestEmail,
  getPaymentSettings,
  updatePaymentSettings,
  getReviewSettings,
  updateReviewSettings,
  getAdvancedSettings,
  updateAdvancedSettings,
  getLineSettings,
  updateLineSettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  getGoogleSettings,
  updateGoogleSettings,
  debugSettings,
} from '../controllers/settings.controller.js';

const router = Router();

// Public environment variables (useful for frontend config dynamically fetched from backend)
router.get('/public-env', (req, res) => {
  res.json({
    erpUrl: process.env.ERP_URL_PUBLIC || '',
    storeUrl: process.env.STORE_URL_PUBLIC || '',
    adminUrl: process.env.ADMIN_URL_PUBLIC || '',
  });
});

// Debug raw data
router.get('/debug', debugSettings);

// Existing branding/design routes
router.get('/', getSettings);
router.put('/', authenticate, requireStaff, updateSettings);
router.post('/logo', authenticate, requireStaff, upload.single('logo'), uploadLogo);
router.post('/favicon', authenticate, requireStaff, upload.single('favicon'), uploadFavicon);
router.post('/hero-background', authenticate, requireStaff, upload.single('image'), uploadHeroBackground);

// General — MANAGER+
router.get('/general', authenticate, requirePermission('UPDATE_GENERAL_SETTINGS', ['SUPER_ADMIN', 'MANAGER']), getGeneralSettings);
router.put('/general', authenticate, requirePermission('UPDATE_GENERAL_SETTINGS', ['SUPER_ADMIN', 'MANAGER']), updateGeneralSettings);

// Order — MANAGER+
router.get('/order', authenticate, requirePermission('UPDATE_ORDER_SETTINGS', ['SUPER_ADMIN', 'MANAGER']), getOrderSettings);
router.put('/order', authenticate, requirePermission('UPDATE_ORDER_SETTINGS', ['SUPER_ADMIN', 'MANAGER']), updateOrderSettings);

// Reservation — MANAGER+
router.get('/reservation', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), getReservationSettings);
router.put('/reservation', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), updateReservationSettings);

// Mail — SUPER_ADMIN only
router.get('/mail', authenticate, requireRole('SUPER_ADMIN'), getMailSettings);
router.put('/mail', authenticate, requireRole('SUPER_ADMIN'), updateMailSettings);
router.post('/mail/test', authenticate, requireRole('SUPER_ADMIN'), sendTestEmail);

// Payment — SUPER_ADMIN only
router.get('/payment', authenticate, requireRole('SUPER_ADMIN'), getPaymentSettings);
router.put('/payment', authenticate, requireRole('SUPER_ADMIN'), updatePaymentSettings);

// Review — MANAGER+
router.get('/review', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), getReviewSettings);
router.put('/review', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), updateReviewSettings);

// Advanced — SUPER_ADMIN only
router.get('/advanced', authenticate, requireRole('SUPER_ADMIN'), getAdvancedSettings);
router.put('/advanced', authenticate, requireRole('SUPER_ADMIN'), updateAdvancedSettings);

// Line — SUPER_ADMIN only
router.get('/line', authenticate, requireRole('SUPER_ADMIN'), getLineSettings);
router.put('/line', authenticate, requireRole('SUPER_ADMIN'), updateLineSettings);

// Google — SUPER_ADMIN only
router.get('/google', authenticate, requireRole('SUPER_ADMIN'), getGoogleSettings);
router.put('/google', authenticate, requireRole('SUPER_ADMIN'), updateGoogleSettings);

// Invoice — SUPER_ADMIN only
router.get('/invoice', authenticate, requireRole('SUPER_ADMIN'), getInvoiceSettings);
router.put('/invoice', authenticate, requireRole('SUPER_ADMIN'), updateInvoiceSettings);
router.get('/ip-blacklist', authenticate, requireRole('SUPER_ADMIN'), async (req, res) => {
  const list = await prisma.iPBlacklist.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: list });
});
router.post('/ip-blacklist', authenticate, requireRole('SUPER_ADMIN'), async (req, res) => {
  const { ip, reason } = req.body;
  if (!ip) return res.status(400).json({ success: false, error: 'IP is required' });
  await prisma.iPBlacklist.upsert({
    where: { ip },
    update: { reason },
    create: { ip, reason }
  });
  res.json({ success: true });
});
router.delete('/ip-blacklist/:ip', authenticate, requireRole('SUPER_ADMIN'), async (req, res) => {
  await prisma.iPBlacklist.delete({ where: { ip: req.params.ip as string } });
  res.json({ success: true });
});

export default router;
