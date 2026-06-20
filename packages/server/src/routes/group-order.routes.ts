import { Router } from 'express';
import { createSession, joinSession, updateCart, getSession } from '../controllers/group-order.controller.js';

const router = Router();

router.post('/create', createSession);
router.post('/join', joinSession);
router.patch('/:id/cart', updateCart);
router.get('/:id', getSession);

export default router;
