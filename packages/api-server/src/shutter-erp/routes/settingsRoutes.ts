import { Router } from 'express';
import { getSettings, updateSettings, getMailBranding, updateMailBranding, testMailBranding } from '../controllers/settingsController.js';

const router = Router();

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/mail-branding', getMailBranding);
router.put('/mail-branding', updateMailBranding);
router.post('/mail-branding/test', testMailBranding);

export default router;
