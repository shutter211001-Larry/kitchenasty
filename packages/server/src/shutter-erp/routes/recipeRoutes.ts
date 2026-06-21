import { Router } from 'express';
import { getRecipes, createRecipe, getRecipeById, updateRecipe, deleteRecipe, updateRecipeLabelConfig, calculateAiNutrition } from '../controllers/recipeController.js';

const router = Router();

router.get('/', getRecipes);
router.post('/', createRecipe);
router.post('/ai-nutrition', calculateAiNutrition);
router.get('/:id', getRecipeById);
router.put('/:id', updateRecipe);
router.patch('/:id/label-config', updateRecipeLabelConfig);
router.delete('/:id', deleteRecipe);

export default router;
