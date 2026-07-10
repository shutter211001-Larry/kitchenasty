import { Router, Request, Response, NextFunction } from 'express';
import { listTenants, createTenant, updateTenant, deleteTenant, resetDemoTenant, getTenantIntegrations, updateTenantIntegrations, sendWelcomeEmail, getTenantLocations } from '../controllers/platform-admin.controller.js';
import { authenticate, requireGlobalAdmin } from '../middleware/auth.js';
import { tenantStorage } from '../middleware/tenantStorage.js';

const router = Router();

// Add unauth route for testing
router.get('/test-tenants', (req, res, next) => {
  tenantStorage.run({ tenantId: null }, () => listTenants(req, res));
});

// Protect all these routes for GLOBAL SUPER_ADMIN only
router.use(authenticate);
router.use(requireGlobalAdmin);

// Bypass tenant-level isolation for platform admin routes so Prisma queries run globally
router.use((req: Request, res: Response, next: NextFunction) => {
  tenantStorage.run({ tenantId: null }, () => next());
});

router.get('/tenants', listTenants);
router.post('/tenants/reset-demo', resetDemoTenant);
router.post('/tenants', createTenant);
router.patch('/tenants/:id', updateTenant);
router.delete('/tenants/:id', deleteTenant);
router.get('/tenants/:id/locations', getTenantLocations);
router.get('/tenants/:id/integrations', getTenantIntegrations);
router.put('/tenants/:id/integrations', updateTenantIntegrations);
router.post('/tenants/:id/send-welcome-email', sendWelcomeEmail);

export default router;
