import { Router } from 'express';
import {
  getMappings,
  saveMapping,
  deleteMapping,
  getShutterData,
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

// Get sync data from Shutter
router.get('/shutter-data', getShutterData);

// Real-time order stock deduction (called by Shutter hook)
router.post('/deduct-inventory', deductInventory);

// Reservation-based intelligent ingredient demand forecasting
router.get('/forecast', getForecast);

// Get product recipes for ERP linking
router.get('/product-recipes', getProductRecipes);

export default router;
