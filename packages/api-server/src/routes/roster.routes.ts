import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listShifts,
  upsertShift,
  deleteShift,
  listAvailabilities,
  saveAvailabilities,
  listRequirements,
  saveRequirements,
} from '../controllers/roster.controller.js';
import { autoSchedule } from '../controllers/auto-schedule.controller.js';

const router = Router();

router.use(authenticate);

// Shifts
router.get('/shifts', listShifts);
router.post('/shifts', upsertShift);
router.delete('/shifts/:id', deleteShift);

// Availabilities
router.get('/availabilities', listAvailabilities);
router.post('/availabilities', saveAvailabilities);

// Requirements
router.get('/requirements', listRequirements);
router.post('/requirements', saveRequirements);

// Auto-Scheduling
router.post('/auto-schedule', autoSchedule);

export default router;
