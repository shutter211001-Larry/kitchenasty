import { Router } from 'express';
import { listTenants, createTenant, updateTenant, resetDemoTenant, getTenantIntegrations, updateTenantIntegrations } from '../controllers/platform-admin.controller.js';
import { authenticate, requireGlobalAdmin } from '../middleware/auth.js';

const router = Router();

// Protect all these routes for GLOBAL SUPER_ADMIN only
router.use(authenticate);
router.use(requireGlobalAdmin);

router.get('/tenants', listTenants);
router.post('/tenants/reset-demo', resetDemoTenant);
router.post('/tenants', createTenant);
router.patch('/tenants/:id', updateTenant);
router.get('/tenants/:id/integrations', getTenantIntegrations);
router.put('/tenants/:id/integrations', updateTenantIntegrations);

export default router;
