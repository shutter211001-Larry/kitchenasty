import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// Helper: Get multiplier to convert package unit to base unit
const getUnitMultiplier = (packageUnit: string, baseUnit: string): number => {
  const pu = packageUnit.trim().toLowerCase();
  const bu = baseUnit.trim().toLowerCase();
  
  if (bu === 'g') {
    if (pu === 'kg' || pu === '公斤') return 1000;
    if (pu === 'g' || pu === '公克') return 1;
    if (pu === '台斤' || pu === '斤') return 600;
  }
  if (bu === 'ml') {
    if (pu === 'l' || pu === '公升') return 1000;
    if (pu === 'ml' || pu === '毫升') return 1;
  }
  return 1;
};

// Helper: Resolve a valid supplier ID, fallback to creating "預設供應商"
const resolveSupplierId = async (supplierId?: string | null): Promise<string> => {
  if (supplierId && supplierId !== 'default' && supplierId !== '') {
    return supplierId;
  }
  let defaultSupplier = await prisma.supplier.findFirst({
    where: { name: '預設供應商' }
  });
  if (!defaultSupplier) {
    defaultSupplier = await prisma.supplier.create({
      data: {
        name: '預設供應商',
        contactPerson: '系統預設',
        phone: 'N/A'
      }
    });
  }
  return defaultSupplier.id;
};

export const getIngredients = async (req: Request, res: Response) => {
  try {
    const { search, category, take } = req.query;
    
    let ingredients = await prisma.ingredient.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { name: { contains: String(search) } },
              { category: { contains: String(search) } }
            ]
          } : {},
          category ? { category: String(category) } : {},
        ]
      },
      include: { 
        unitConversions: true,
        allergens: true,
        prices: { include: { supplier: true } }
      },
      take: take ? Number(take) : (search ? 300 : undefined),
    });
    
    if (search) {
      const s = String(search).toLowerCase();
      ingredients.sort((a: any, b: any) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        const aExact = aName === s;
        const bExact = bName === s;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aName.startsWith(s);
        const bStarts = bName.startsWith(s);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        if (aName.length !== bName.length) {
          return aName.length - bName.length;
        }

        return aName.localeCompare(bName);
      });
      ingredients = ingredients.slice(0, 50);
    } else {
      ingredients.sort((a: any, b: any) => a.name.localeCompare(b.name));
    }
    
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
};

export const getIngredientById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: { 
        prices: { include: { supplier: true } },
        unitConversions: true,
        allergens: true,
      }
    });
    
    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });
    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ingredient' });
  }
};

export const createIngredient = async (req: Request, res: Response) => {
  try {
    const { 
      name, category, unit, safetyStock, 
      calories, protein, fat, carbohydrates, sodium,
      saturatedFat, transFat, sugar,
      isAllergen, allergenType, allergenIds, priceInfo,
      components
    } = req.body;
    
    if (!name || !unit) return res.status(400).json({ error: '名稱與單位為必填' });
    
    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        category: category || null,
        unit,
        components: components || null,
        safetyStock: safetyStock != null && safetyStock !== '' ? Number(safetyStock) : null,
        currentStock: 0,
        calories: calories != null ? Number(calories) : null,
        protein: protein != null ? Number(protein) : null,
        fat: fat != null ? Number(fat) : null,
        carbohydrates: carbohydrates != null ? Number(carbohydrates) : null,
        sodium: sodium != null ? Number(sodium) : null,
        saturatedFat: saturatedFat != null ? Number(saturatedFat) : null,
        transFat: transFat != null ? Number(transFat) : null,
        sugar: sugar != null ? Number(sugar) : null,
        isAllergen: isAllergen || false,
        allergenType: allergenType || null,
        allergens: allergenIds && allergenIds.length > 0 ? {
          connect: allergenIds.map((aid: string) => ({ id: aid }))
        } : undefined
      },
      include: { 
        unitConversions: true,
        allergens: true,
        prices: { include: { supplier: true } }
      }
    });

    // If purchase price info is provided, calculate and save SupplierPrice
    if (priceInfo && priceInfo.packageSize && priceInfo.price) {
      const finalSupplierId = await resolveSupplierId(priceInfo.supplierId);
      const multiplier = getUnitMultiplier(priceInfo.packageUnit || 'g', unit);
      const baseQty = Number(priceInfo.packageSize) * multiplier;
      const unitPrice = baseQty > 0 ? Number(priceInfo.price) / baseQty : 0;

      await prisma.supplierPrice.create({
        data: {
          ingredientId: ingredient.id,
          supplierId: finalSupplierId,
          packageSize: Number(priceInfo.packageSize),
          packageUnit: priceInfo.packageUnit || 'g',
          price: Number(priceInfo.price),
          unitPrice: unitPrice,
          isDefault: true
        }
      });
    }
    
    // Fetch refreshed ingredient with prices
    const refreshed = await prisma.ingredient.findUnique({
      where: { id: ingredient.id },
      include: {
        unitConversions: true,
        allergens: true,
        prices: { include: { supplier: true } }
      }
    });

    res.status(201).json(refreshed);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create ingredient', details: error.message, stack: error.stack });
  }
};

export const updateIngredient = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { 
      name, category, unit, safetyStock, currentStock, 
      calories, protein, fat, carbohydrates, sodium,
      saturatedFat, transFat, sugar,
      isAllergen, allergenType, allergenIds, priceInfo,
      components
    } = req.body;
    
    const updateData: any = {
      name,
      category: category === '' ? null : category,
      unit,
      components: components !== undefined ? (components === '' ? null : components) : undefined,
      safetyStock: safetyStock !== undefined ? (safetyStock === null || safetyStock === '' ? null : Number(safetyStock)) : undefined,
      currentStock: currentStock != null ? Number(currentStock) : undefined,
      calories: calories !== undefined ? (calories === null || calories === '' ? null : Number(calories)) : undefined,
      protein: protein !== undefined ? (protein === null || protein === '' ? null : Number(protein)) : undefined,
      fat: fat !== undefined ? (fat === null || fat === '' ? null : Number(fat)) : undefined,
      carbohydrates: carbohydrates !== undefined ? (carbohydrates === null || carbohydrates === '' ? null : Number(carbohydrates)) : undefined,
      sodium: sodium !== undefined ? (sodium === null || sodium === '' ? null : Number(sodium)) : undefined,
      saturatedFat: saturatedFat !== undefined ? (saturatedFat === null || saturatedFat === '' ? null : Number(saturatedFat)) : undefined,
      transFat: transFat !== undefined ? (transFat === null || transFat === '' ? null : Number(transFat)) : undefined,
      sugar: sugar !== undefined ? (sugar === null || sugar === '' ? null : Number(sugar)) : undefined,
      isAllergen,
      allergenType,
    };

    if (allergenIds) {
      updateData.allergens = {
        set: allergenIds.map((aid: string) => ({ id: aid }))
      };
    }

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: updateData,
      include: { 
        unitConversions: true,
        allergens: true,
        prices: { include: { supplier: true } }
      }
    });

    // If purchase price info is provided, calculate and update/create SupplierPrice
    if (priceInfo && priceInfo.packageSize && priceInfo.price) {
      const finalSupplierId = await resolveSupplierId(priceInfo.supplierId);
      const multiplier = getUnitMultiplier(priceInfo.packageUnit || 'g', ingredient.unit);
      const baseQty = Number(priceInfo.packageSize) * multiplier;
      const unitPrice = baseQty > 0 ? Number(priceInfo.price) / baseQty : 0;

      const existingPrice = await prisma.supplierPrice.findFirst({
        where: { ingredientId: id, isDefault: true }
      });

      if (existingPrice) {
        await prisma.supplierPrice.update({
          where: { id: existingPrice.id },
          data: {
            supplierId: finalSupplierId,
            packageSize: Number(priceInfo.packageSize),
            packageUnit: priceInfo.packageUnit || 'g',
            price: Number(priceInfo.price),
            unitPrice: unitPrice
          }
        });
      } else {
        await prisma.supplierPrice.create({
          data: {
            ingredientId: id,
            supplierId: finalSupplierId,
            packageSize: Number(priceInfo.packageSize),
            packageUnit: priceInfo.packageUnit || 'g',
            price: Number(priceInfo.price),
            unitPrice: unitPrice,
            isDefault: true
          }
        });
      }
    }
    
    // Fetch refreshed ingredient with updated prices
    const refreshed = await prisma.ingredient.findUnique({
      where: { id },
      include: {
        unitConversions: true,
        allergens: true,
        prices: { include: { supplier: true } }
      }
    });

    res.json(refreshed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update ingredient' });
  }
};

export const addUnitConversion = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { fromUnit, toUnit, multiplier } = req.body;
    
    if (!fromUnit || !toUnit || multiplier === undefined) {
      return res.status(400).json({ error: 'fromUnit, toUnit, multiplier 均為必填' });
    }
    
    const conversion = await prisma.unitConversion.create({
      data: {
        ingredientId: id,
        fromUnit,
        toUnit,
        multiplier: parseFloat(multiplier),
      }
    });
    
    res.status(201).json(conversion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add unit conversion' });
  }
};

export const deleteUnitConversion = async (req: Request, res: Response) => {
  try {
    const convId = req.params.convId as string;
    await prisma.unitConversion.delete({ where: { id: convId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete unit conversion' });
  }
};

export const deleteIngredient = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const recipeCount = await prisma.recipeItem.count({ where: { ingredientId: id } });
    if (recipeCount > 0) {
      return res.status(400).json({ error: '無法刪除：此食材已被食譜使用！' });
    }

    const inventoryCount = await prisma.inventoryLog.count({ where: { ingredientId: id } });
    if (inventoryCount > 0) {
      return res.status(400).json({ error: '無法刪除：此食材已有庫存異動紀錄！' });
    }
    
    await prisma.supplierPrice.deleteMany({ where: { ingredientId: id } });
    await prisma.ingredient.delete({ where: { id } });
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete ingredient', error);
    res.status(500).json({ error: '刪除食材失敗' });
  }
};
