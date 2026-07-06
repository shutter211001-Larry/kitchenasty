import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listJobRoles,
  createJobRole,
  updateJobRole,
  deleteJobRole,
  assignUsersToRole,
} from '../controllers/job-role.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listJobRoles);
router.post('/', createJobRole);
router.put('/:id', updateJobRole);
router.delete('/:id', deleteJobRole);
router.post('/:id/assign', assignUsersToRole);

export default router;
