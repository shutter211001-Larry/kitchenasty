import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getSettings,
  updateSettings,
  uploadLogo,
  uploadFavicon,
} from '../controllers/settings.controller.js';

const router = Router();

router.get('/', getSettings);
router.put('/', authenticate, requireStaff, updateSettings);
router.post('/logo', authenticate, requireStaff, upload.single('logo'), uploadLogo);
router.post('/favicon', authenticate, requireStaff, upload.single('favicon'), uploadFavicon);

export default router;
