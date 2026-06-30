import { Router } from 'express';
import { getSettings, updateSettings, getMailBranding, updateMailBranding, testMailBranding, createErpTables } from '../controllers/settingsController.js';

const router = Router();

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/mail-branding', getMailBranding);
router.put('/mail-branding', updateMailBranding);
router.post('/mail-branding/test', testMailBranding);
router.get('/create-erp-tables', createErpTables);

export default router;
