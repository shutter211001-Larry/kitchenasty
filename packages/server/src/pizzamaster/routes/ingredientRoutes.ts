import { Router } from 'express';
import { getIngredients, getIngredientById, createIngredient, updateIngredient, addUnitConversion, deleteUnitConversion, deleteIngredient } from '../controllers/ingredientController.js';

const router = Router();

router.get('/', getIngredients);
router.post('/', createIngredient);
router.get('/:id', getIngredientById);
router.patch('/:id', updateIngredient);
router.delete('/:id', deleteIngredient);
router.post('/:id/conversions', addUnitConversion);
router.delete('/:id/conversions/:convId', deleteUnitConversion);

export default router;
