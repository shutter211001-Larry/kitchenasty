import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import {
  createReservation,
  listReservations,
  getReservation,
  updateReservation,
  deleteReservation,
  listCustomerReservations,
  checkAvailability,
} from '../controllers/reservation.controller.js';

const router = Router();

// Public: check availability
router.get('/availability', checkAvailability);

// Customer: own reservations
router.get('/my-reservations', authenticate, listCustomerReservations);

// Customer: create reservation
router.post('/', authenticate, createReservation);

// Staff: manage reservations
router.get('/', authenticate, requireStaff, listReservations);
router.get('/:id', authenticate, getReservation);
router.patch('/:id', authenticate, requireStaff, updateReservation);
router.delete('/:id', authenticate, requireStaff, deleteReservation);

export default router;
