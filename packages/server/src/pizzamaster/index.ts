import { Router } from 'express';
import ingredientRoutes from './routes/ingredientRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import recipeRoutes from './routes/recipeRoutes.js';
import dictionaryRoutes from './routes/dictionaryRoutes.js';
import allergenRoutes from './routes/allergenRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import authRoutes from './routes/authRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import userRoutes from './routes/userRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';

const router = Router();

// Mount PizzaMaster API routes under /api
router.use('/api/ingredients', ingredientRoutes);
router.use('/api/suppliers', supplierRoutes);
router.use('/api/recipes', recipeRoutes);
router.use('/api/dictionaries', dictionaryRoutes);
router.use('/api/allergens', allergenRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/inventory', inventoryRoutes);
router.use('/api/users', userRoutes);
router.use('/api/integration', integrationRoutes);

export default router;
