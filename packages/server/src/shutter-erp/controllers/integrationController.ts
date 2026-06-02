import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import mainPrisma from '../../lib/db.js';
import { calculateRecipeStats } from './recipeController.js';
import fs from 'fs';
import path from 'path';

const MAPPINGS_FILE = path.join(__dirname, '../../../data/integration_mappings.json');

// Helper to read mappings
const readMappings = (): any[] => {
  try {
    if (!fs.existsSync(MAPPINGS_FILE)) {
      const dir = path.dirname(MAPPINGS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(MAPPINGS_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(MAPPINGS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('[Integration ERP] Failed to read mappings:', err);
    return [];
  }
};

// Helper to write mappings
const writeMappings = (mappings: any[]) => {
  try {
    const dir = path.dirname(MAPPINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Integration ERP] Failed to write mappings:', err);
  }
};

// Get KitchenAsty URL and Token
const getKitchenAstyUrl = () => {
  const port = process.env.PORT || '3000';
  let url = (process.env.KITCHENASTY_API_URL || process.env.SHUTTER_ERP_API_URL || `http://127.0.0.1:${port}`).trim();
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
};

const getIntegrationKey = () => {
  return process.env.INTEGRATION_KEY || 'pizzamaster-integration-secret-key';
};

// Helper to make API calls to KitchenAsty
const fetchKitchenAsty = async (endpoint: string) => {
  const url = `${getKitchenAstyUrl()}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'x-integration-key': getIntegrationKey(),
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`KitchenAsty returned HTTP ${response.status}`);
    }
    
    const result = await response.json().catch(() => ({ success: false, error: 'Invalid JSON' }));
    if (!result.success) {
      throw new Error(result.error || 'API execution failed');
    }
    return result.data;
  } catch (err: any) {
    console.error(`[Integration ERP] Fetch failed for ${endpoint}:`, err.message);
    throw err;
  }
};

// 1. Get Mappings
export const getMappings = async (req: Request, res: Response) => {
  try {
    const mappings = await mainPrisma.erpRecipeMapping.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ success: true, data: mappings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Save Mapping
export const saveMapping = async (req: Request, res: Response) => {
  try {
    const { menuItemId, recipeId, menuItemName, menuItemPrice, recipeName } = req.body;
    
    if (!menuItemId || !recipeId) {
      return res.status(400).json({ success: false, error: 'menuItemId and recipeId are required' });
    }
    
    const newMapping = await mainPrisma.erpRecipeMapping.upsert({
      where: { menuItemId },
      create: {
        menuItemId,
        recipeId,
        menuItemName: menuItemName || '',
        menuItemPrice: menuItemPrice || 0,
        recipeName: recipeName || '',
      },
      update: {
        recipeId,
        menuItemName: menuItemName || '',
        menuItemPrice: menuItemPrice || 0,
        recipeName: recipeName || '',
      }
    });
    
    res.json({ success: true, data: newMapping });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Delete Mapping
export const deleteMapping = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    
    await mainPrisma.erpRecipeMapping.delete({
      where: { menuItemId: menuItemId as string }
    });
    res.json({ success: true, message: 'Mapping deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Proxy KitchenAsty Data
export const getKitchenAstyData = async (req: Request, res: Response) => {
  try {
    console.log('[Integration ERP] Syncing data from KitchenAsty...');
    
    let menuItems = [];
    let orders = [];
    let reservations = [];
    let connectionOk = false;
    let connError = '';

    try {
      menuItems = await fetchKitchenAsty('/api/integration/menu-items');
      orders = await fetchKitchenAsty('/api/integration/orders');
      reservations = await fetchKitchenAsty('/api/integration/reservations');
      connectionOk = true;
    } catch (e: any) {
      connError = e.message;
      console.warn('[Integration ERP] KitchenAsty connection offline:', e.message);
    }

    res.json({
      success: true,
      data: {
        connectionOk,
        connError,
        menuItems,
        orders,
        reservations
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 5. Deduct Inventory (Idempotent)
export const deductInventory = async (req: Request, res: Response) => {
  try {
    // Check if integration key in header matches (incoming request from KitchenAsty)
    const key = req.headers['x-integration-key'];
    if (key !== getIntegrationKey()) {
      return res.status(401).json({ success: false, error: 'Unauthorized integration key' });
    }

    const { orderId, orderNumber, items } = req.body;
    
    if (!orderNumber || !items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Invalid payload: orderNumber and items array required' });
    }

    // 1. Idempotency Check: Check if we have already deducted for this orderNumber
    const existingLog = await prisma.inventoryLog.findFirst({
      where: {
        reason: {
          contains: `線上訂餐 #${orderNumber}`
        }
      }
    });

    if (existingLog) {
      console.log(`[Integration ERP] Idempotent trigger: Order #${orderNumber} already deducted. Skipping.`);
      return res.json({ success: true, message: 'Deduction already completed (idempotent step)', skipped: true });
    }

    console.log(`[Integration ERP] Processing stock deduction for Order #${orderNumber}...`);
    const mappings = await mainPrisma.erpRecipeMapping.findMany();
    const deductions: { ingredientId: string, name: string, amount: number, unit: string }[] = [];

    // 2. Loop order items and calculate required quantities
    for (const item of items) {
      const mapping = mappings.find((m: any) => m.menuItemId === item.menuItemId);
      if (!mapping) {
        console.log(`[Integration ERP] No recipe mapping found for Menu Item: ${item.name} (${item.menuItemId})`);
        continue;
      }

      // Fetch R&D Recipe Stats (recursively calculates ingredients for sub-recipes as well!)
      const stats = await calculateRecipeStats(mapping.recipeId);
      const recipe = await prisma.recipe.findUnique({ where: { id: mapping.recipeId } });
      const yieldAmount = recipe?.yieldAmount || 1;

      for (const ingredient of stats.totalIngredients) {
        // Consumed amount = (IngredientQty / YieldAmount) * OrderItemQty
        const portion = ingredient.quantity / yieldAmount;
        const consumed = portion * item.quantity;

        const existing = deductions.find(d => d.ingredientId === ingredient.id);
        if (existing) {
          existing.amount += consumed;
        } else {
          deductions.push({
            ingredientId: ingredient.id,
            name: ingredient.name,
            amount: consumed,
            unit: ingredient.unit
          });
        }
      }
    }

    // 3. Apply deductions in transaction to prevent partial updates
    if (deductions.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const dec of deductions) {
          // Decrement current stock
          await tx.ingredient.update({
            where: { id: dec.ingredientId },
            data: {
              currentStock: {
                decrement: dec.amount
              }
            }
          });

          // Log in Inventory Logs
          await tx.inventoryLog.create({
            data: {
              ingredientId: dec.ingredientId,
              type: 'OUT',
              amount: dec.amount,
              reason: `線上訂餐 #${orderNumber} 自動扣減 (品項明細: ${items.map(i => `${i.name}x${i.quantity}`).join(', ')})`
            }
          });
        }
      });
      console.log(`[Integration ERP] Successfully deducted stock for ${deductions.length} ingredients from Order #${orderNumber}`);
    } else {
      console.log(`[Integration ERP] No ingredients needed to be deducted for Order #${orderNumber}`);
    }

    res.json({ success: true, deductedIngredients: deductions });
  } catch (err: any) {
    console.error(`[Integration ERP] Stock deduction failed:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// 6. Intelligent Demand Forecasting from upcoming reservations
export const getForecast = async (req: Request, res: Response) => {
  try {
    const mappings = await mainPrisma.erpRecipeMapping.findMany();
    if (mappings.length === 0) {
      return res.json({
        success: true,
        totalGuests: 0,
        forecastedIngredients: [],
        message: 'No recipe mappings configured yet. Cannot forecast.'
      });
    }

    // Fetch KitchenAsty orders and reservations
    let orders = [];
    let reservations = [];
    try {
      orders = await fetchKitchenAsty('/api/integration/orders');
      reservations = await fetchKitchenAsty('/api/integration/reservations');
    } catch (e: any) {
      return res.status(503).json({
        success: false,
        error: `Cannot calculate forecast because KitchenAsty is offline: ${e.message}`
      });
    }

    // A. Calculate popularity weights from active/historical order items
    const popularityMap = new Map<string, { menuItemId: string, name: string, count: number }>();
    let totalMappedItemsCount = 0;

    for (const order of orders) {
      if (order.status === 'CANCELLED') continue;
      for (const item of (order.items || [])) {
        const mapping = mappings.find((m: any) => m.menuItemId === item.menuItemId);
        if (mapping) {
          totalMappedItemsCount += item.quantity || 1;
          const existing = popularityMap.get(item.menuItemId);
          if (existing) {
            existing.count += item.quantity || 1;
          } else {
            popularityMap.set(item.menuItemId, {
              menuItemId: item.menuItemId,
              name: item.name,
              count: item.quantity || 1
            });
          }
        }
      }
    }

    // B. Calculate weights (defaulting to equal ratios if no historical orders exist)
    const weights: { menuItemId: string, name: string, weight: number }[] = [];
    if (totalMappedItemsCount > 0) {
      popularityMap.forEach((val) => {
        weights.push({
          menuItemId: val.menuItemId,
          name: val.name,
          weight: val.count / totalMappedItemsCount
        });
      });
    } else {
      // Fallback: Equal distribution
      mappings.forEach((m: any) => {
        weights.push({
          menuItemId: m.menuItemId,
          name: m.menuItemName,
          weight: 1 / mappings.length
        });
      });
    }

    // C. Calculate total upcoming guests
    const totalGuests = reservations.reduce((sum: number, r: any) => sum + (r.partySize || 0), 0);

    // D. Forecast predicted counts: EstimatedQty = TotalGuests * Weight
    // (Assuming on average 1 guest orders 1 item, which is standard in pizzeria dining contexts)
    const forecastedIngredientsMap = new Map<string, {
      ingredientId: string,
      name: string,
      predictedDemand: number,
      currentStock: number,
      safetyStock: number,
      unit: string,
      shortage: boolean,
      shortageAmount: number
    }>();

    for (const wt of weights) {
      const mapping = mappings.find((m: any) => m.menuItemId === wt.menuItemId)!;
      const estimatedOrders = totalGuests * wt.weight;
      if (estimatedOrders <= 0) continue;

      const stats = await calculateRecipeStats(mapping.recipeId);
      const recipe = await prisma.recipe.findUnique({ where: { id: mapping.recipeId } });
      const yieldAmount = recipe?.yieldAmount || 1;

      for (const ingredient of stats.totalIngredients) {
        const portion = ingredient.quantity / yieldAmount;
        const predictedUse = portion * estimatedOrders;

        const existing = forecastedIngredientsMap.get(ingredient.id);
        if (existing) {
          existing.predictedDemand += predictedUse;
        } else {
          // Fetch ingredient current and safety stock details
          const ingDetail = await prisma.ingredient.findUnique({
            where: { id: ingredient.id },
            select: { currentStock: true, safetyStock: true }
          });
          
          forecastedIngredientsMap.set(ingredient.id, {
            ingredientId: ingredient.id,
            name: ingredient.name,
            predictedDemand: predictedUse,
            currentStock: ingDetail?.currentStock ?? 0,
            safetyStock: ingDetail?.safetyStock ?? 0,
            unit: ingredient.unit,
            shortage: false,
            shortageAmount: 0
          });
        }
      }
    }

    // E. Evaluate shortages and safety stocks
    const forecastedIngredients = Array.from(forecastedIngredientsMap.values()).map(item => {
      // Shortage if: currentStock < predictedDemand
      const shortage = item.currentStock < item.predictedDemand;
      const shortageAmount = shortage ? (item.predictedDemand - item.currentStock) : 0;
      return {
        ...item,
        shortage,
        shortageAmount
      };
    });

    res.json({
      success: true,
      totalGuests,
      reservationsCount: reservations.length,
      popularityWeights: weights,
      forecastedIngredients: forecastedIngredients.sort((a, b) => b.predictedDemand - a.predictedDemand)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 7. Get Product Recipes (Recipes where isProduct is true)
export const getProductRecipes = async (req: Request, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: {
        isProduct: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        yieldAmount: true,
        yieldUnit: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const enrichedRecipes = await Promise.all(recipes.map(async (r) => {
      const stats = await calculateRecipeStats(r.id);
      const allergenNames = new Set<string>();
      stats.totalIngredients.forEach((ing: any) => {
        if (ing.allergens) {
          ing.allergens.forEach((a: any) => allergenNames.add(a.name));
        }
      });
      return {
        ...r,
        allergens: Array.from(allergenNames)
      };
    }));

    res.json({ success: true, data: enrichedRecipes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
