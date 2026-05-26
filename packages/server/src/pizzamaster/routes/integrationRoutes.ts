import { Router } from 'express';
import {
  getMappings,
  saveMapping,
  deleteMapping,
  getKitchenAstyData,
  deductInventory,
  getForecast,
  getProductRecipes
} from '../controllers/integrationController.js';

const router = Router();

// Retrieve mappings
router.get('/mappings', getMappings);

// Save or update mapping
router.post('/mappings', saveMapping);

// Delete mapping by menuItemId
router.delete('/mappings/:menuItemId', deleteMapping);

// Get sync data from KitchenAsty
router.get('/kitchenasty-data', getKitchenAstyData);

// Real-time order stock deduction (called by KitchenAsty hook)
router.post('/deduct-inventory', deductInventory);

// Reservation-based intelligent ingredient demand forecasting
router.get('/forecast', getForecast);

// Get product recipes for ERP linking
router.get('/product-recipes', getProductRecipes);

export default router;
