import { Router } from 'express';
import { getAllergens, createAllergen, deleteAllergen } from '../controllers/allergenController.js';

const router = Router();

router.get('/', getAllergens);
router.post('/', createAllergen);
router.delete('/:id', deleteAllergen);

export default router;
