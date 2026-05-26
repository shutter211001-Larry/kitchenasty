import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {

    const totalIngredients = await prisma.ingredient.count();
    const totalRecipes = await prisma.recipe.count();
    const totalSuppliers = await prisma.supplier.count();

    // Fetch ingredients below safetyStock, excluding those where safetyStock is NULL
    const lowStockIngredients = await prisma.$queryRaw<any[]>`
      SELECT id, name, category, unit, "currentStock", "safetyStock"
      FROM "Ingredient"
      WHERE "safetyStock" IS NOT NULL AND "currentStock" <= "safetyStock"
      ORDER BY name ASC
    `;

    // Fetch top 10 recent supplier price updates (excluding deleted or non-existent suppliers)
    const recentPriceUpdates = await prisma.supplierPrice.findMany({
      where: {
        supplierId: {
          not: null
        }
      },
      include: {
        supplier: true,
        ingredient: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    res.json({
      totalIngredients,
      totalRecipes,
      totalSuppliers,
      lowStockCount: lowStockIngredients.length,
      lowStockIngredients: lowStockIngredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        category: ing.category,
        unit: ing.unit,
        currentStock: Number(ing.currentStock) || 0,
        safetyStock: ing.safetyStock != null ? Number(ing.safetyStock) : null
      })),
      recentPriceUpdates: recentPriceUpdates
        .filter(up => up.supplier !== null && up.supplier !== undefined)
        .map(up => ({
          id: up.id,
          supplierName: up.supplier!.name,
          ingredientName: up.ingredient.name,
          packageSize: Number(up.packageSize),
          packageUnit: up.packageUnit,
          price: Number(up.price),
          updatedAt: up.updatedAt.toISOString()
        }))
    });
  } catch (error) {
    console.error('Failed to calculate dashboard stats', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

