import { Router } from 'express';
import * as i18nController from '../controllers/i18n.controller.js';

const router = Router();

// /api/i18n/locales/:lng/:ns/missing
router.post('/locales/:lng/:ns/missing', i18nController.saveMissingKey);

export default router;
