import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// Recursive function to calculate cost and nutrition including Saturated Fat, Trans Fat, and Sugar
export async function calculateRecipeStats(recipeId: string): Promise<{ 
  cost: number, 
  calories: number, 
  protein: number,
  fat: number,
  carbohydrates: number,
  sodium: number,
  saturatedFat: number,
  transFat: number,
  sugar: number,
  totalWeight: number,
  totalIngredients: { id: string, name: string, quantity: number, unit: string }[],
  unmeasurableItems: { name: string, itemUnit: string, baseUnit: string }[]
}> {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        steps: {
          include: {
            items: {
              include: {
                ingredient: {
                  include: { 
                    prices: { orderBy: { createdAt: 'desc' }, take: 1 },
                    unitConversions: true,
                    allergens: true
                  }
                },
                subRecipe: true
              }
            }
          }
        }
      }
    });

    if (!recipe) {
      return { 
        cost: 0, calories: 0, protein: 0, fat: 0, carbohydrates: 0, sodium: 0, 
        saturatedFat: 0, transFat: 0, sugar: 0, totalWeight: 0, totalIngredients: [], unmeasurableItems: [] 
      };
    }

    // Helper: resolve the effective quantity in the ingredient's base unit
    const resolveQuantityInBaseUnit = (quantity: number, itemUnit: string, ingredient: any): number | null => {
      if (!itemUnit || itemUnit === ingredient.unit) return quantity;
      // Look for a matching conversion: fromUnit=itemUnit, toUnit=ingredient.unit
      const conv = (ingredient.unitConversions || []).find(
        (c: any) => c.fromUnit === itemUnit && c.toUnit === ingredient.unit
      );
      if (conv) return quantity * conv.multiplier;
      // Try reverse: fromUnit=ingredient.unit, toUnit=itemUnit → divide
      const revConv = (ingredient.unitConversions || []).find(
        (c: any) => c.fromUnit === ingredient.unit && c.toUnit === itemUnit
      );
      if (revConv) return quantity / revConv.multiplier;
      return null; // no conversion found
    };

    let stats = {
      cost: 0,
      calories: 0,
      protein: 0,
      fat: 0,
      carbohydrates: 0,
      sodium: 0,
      saturatedFat: 0,
      transFat: 0,
      sugar: 0,
      totalWeight: 0,
      totalIngredients: [] as { id: string, name: string, quantity: number, unit: string, allergens?: { id: string, name: string }[] }[],
      unmeasurableItems: [] as { name: string, itemUnit: string, baseUnit: string }[]
    };
    
    const ingredientMap = new Map<string, { id: string, name: string, quantity: number, unit: string, allergens?: { id: string, name: string }[] }>();

    // Safely get all items across all steps
    const allItems = recipe.steps?.flatMap(s => s.items || []) || [];

    for (const item of allItems) {
      if (item.ingredientId && item.ingredient) {
        const itemUnit = (item as any).unit || item.ingredient.unit;
        const effectiveQty = resolveQuantityInBaseUnit(item.quantity || 0, itemUnit, item.ingredient);
        
        if (effectiveQty === null) {
          // No conversion found — cannot calculate nutrition
          stats.unmeasurableItems.push({ 
            name: item.ingredient.name, 
            itemUnit, 
            baseUnit: item.ingredient.unit 
          });
        } else {
          const latestPrice = item.ingredient.prices?.[0];
          if (latestPrice) {
            stats.cost += effectiveQty * (latestPrice.unitPrice || 0);
          }
          const ratio = effectiveQty / 100;
          stats.calories += ratio * (item.ingredient.calories || 0);
          stats.protein += ratio * (item.ingredient.protein || 0);
          stats.fat += ratio * (item.ingredient.fat || 0);
          stats.carbohydrates += ratio * (item.ingredient.carbohydrates || 0);
          stats.sodium += ratio * (item.ingredient.sodium || 0);
          stats.saturatedFat += ratio * (item.ingredient.saturatedFat || 0);
          stats.transFat += ratio * (item.ingredient.transFat || 0);
          stats.sugar += ratio * (item.ingredient.sugar || 0);
          stats.totalWeight += effectiveQty;

          const ingredientAllergens = (item.ingredient.allergens || []).map((a: any) => ({ id: a.id, name: a.name }));
          const existing = ingredientMap.get(item.ingredient.id);
          if (existing) {
            existing.quantity += effectiveQty;
            if (ingredientAllergens.length > 0) {
              const merged = new Map((existing.allergens || []).map((a: any) => [a.id, a]));
              ingredientAllergens.forEach((a: any) => merged.set(a.id, a));
              existing.allergens = Array.from(merged.values());
            }
          } else {
            ingredientMap.set(item.ingredient.id, {
              id: item.ingredient.id,
              name: item.ingredient.name,
              quantity: effectiveQty,
              unit: item.ingredient.unit,
              allergens: ingredientAllergens
            });
          }
        }
      } else if (item.subRecipeId) {
        try {
          const subStats = await calculateRecipeStats(item.subRecipeId);
          const subRecipe = await prisma.recipe.findUnique({ where: { id: item.subRecipeId } });
          const yieldAmount = subRecipe?.yieldAmount || 1;
          
          let ratio = 0;
          if (item.portionQuantity) {
            ratio = item.portionQuantity / yieldAmount;
          } else {
            ratio = (item.quantity || 0) / (subStats.totalWeight || 1);
          }

          stats.cost += (subStats.cost || 0) * ratio;
          stats.calories += (subStats.calories || 0) * ratio;
          stats.protein += (subStats.protein || 0) * ratio;
          stats.fat += (subStats.fat || 0) * ratio;
          stats.carbohydrates += (subStats.carbohydrates || 0) * ratio;
          stats.sodium += (subStats.sodium || 0) * ratio;
          stats.saturatedFat += (subStats.saturatedFat || 0) * ratio;
          stats.transFat += (subStats.transFat || 0) * ratio;
          stats.sugar += (subStats.sugar || 0) * ratio;
          stats.totalWeight += (subStats.totalWeight || 0) * ratio;
          
          for (const subIng of subStats.totalIngredients) {
            const sub: any = subIng;
            const scaledQty = sub.quantity * ratio;
            const existing = ingredientMap.get(sub.id);
            if (existing) {
              existing.quantity += scaledQty;
              if (sub.allergens && sub.allergens.length > 0) {
                const merged = new Map((existing.allergens || []).map((a: any) => [a.id, a]));
                sub.allergens.forEach((a: any) => merged.set(a.id, a));
                existing.allergens = Array.from(merged.values());
              }
            } else {
              ingredientMap.set(sub.id, {
                id: sub.id,
                name: sub.name,
                quantity: scaledQty,
                unit: sub.unit,
                allergens: sub.allergens || []
              });
            }
          }
        } catch (e) {
          console.error(`Failed to calculate sub-recipe ${item.subRecipeId} stats`, e);
        }
      }
    }

    // Apply Baking Loss Rate to totalWeight
    const lossRate = recipe.bakingLossRate || 0;
    if (lossRate > 0 && lossRate < 100) {
      stats.totalWeight = stats.totalWeight * (1 - lossRate / 100);
    }

    stats.totalIngredients = Array.from(ingredientMap.values());
    return stats;
  } catch (error) {
    console.error(`Error calculating stats for recipe ${recipeId}:`, error);
    return { 
      cost: 0, calories: 0, protein: 0, fat: 0, carbohydrates: 0, sodium: 0, 
      saturatedFat: 0, transFat: 0, sugar: 0, totalWeight: 0, totalIngredients: [], unmeasurableItems: [] 
    };
  }
}

export const getRecipes = async (req: Request, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: { items: true }
    });
    
    // Enrich with calculated stats
    const enrichedRecipes = await Promise.all(recipes.map(async (r) => {
      const stats = await calculateRecipeStats(r.id);
      return { ...r, ...stats };
    }));
    
    res.json(enrichedRecipes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};

// Helper: create steps then items, resolving clientId → dbId for sourceStepId
const createStepsWithItems = async (tx: any, recipeId: string, steps: any[]) => {
  // Pass 1: create steps (no items), record clientId → dbId mapping
  const clientToDbId = new Map<string, string>();
  for (let sIdx = 0; sIdx < steps.length; sIdx++) {
    const step = steps[sIdx];
    const dbStep = await tx.recipeStep.create({
      data: {
        recipeId,
        action: step.action,
        description: step.description || null,
        order: sIdx,
        parameters: {
          create: (step.parameters || []).map((p: any) => ({
            value: p.value,
            unit: p.unit
          }))
        }
      }
    });
    clientToDbId.set(step.id, dbStep.id);
  }

  // Pass 2: create items, resolving sourceStepId
  for (let sIdx = 0; sIdx < steps.length; sIdx++) {
    const step = steps[sIdx];
    const dbStepId = clientToDbId.get(step.id)!;
    for (let iIdx = 0; iIdx < (step.items || []).length; iIdx++) {
      const item = step.items[iIdx];
      const resolvedSourceStepId = item.sourceStepId
        ? (clientToDbId.get(item.sourceStepId) || null)
        : null;
      await tx.recipeItem.create({
        data: {
          recipeId,
          stepId: dbStepId,
          quantity: item.quantity || 0,
          portionQuantity: item.portionQuantity || null,
          unit: item.unit || 'g',
          ingredientId: item.ingredientId || null,
          subRecipeId: item.subRecipeId || null,
          sourceStepId: resolvedSourceStepId,
          order: iIdx,
        }
      });
    }
  }
};

export const createRecipe = async (req: Request, res: Response) => {
  try {
    const { name, description, yieldAmount, yieldUnit, isSubRecipe, isProduct, bakingLossRate } = req.body;
    const stepsPayload = req.body.steps || [];

    const recipe = await prisma.$transaction(async (tx) => {
      const newRecipe = await tx.recipe.create({
        data: { 
          name, 
          description, 
          yieldAmount: yieldAmount || 1, 
          yieldUnit: yieldUnit || '份',
          isSubRecipe: !!isSubRecipe,
          isProduct: isProduct === undefined ? true : !!isProduct,
          bakingLossRate: bakingLossRate !== undefined ? parseFloat(bakingLossRate) || 0 : 0
        }
      });
      await createStepsWithItems(tx, newRecipe.id, stepsPayload);
      return tx.recipe.findUnique({
        where: { id: newRecipe.id },
        include: { steps: { include: { items: true, parameters: true } } }
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    res.status(201).json(recipe);
  } catch (error) {
    console.error('Create Recipe Error:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
};

export const getRecipeById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            ingredient: true,
            subRecipe: true
          }
        },
        steps: {
          orderBy: { order: 'asc' },
          include: {
            parameters: true,
            items: {
              include: {
                ingredient: true,
                subRecipe: true,
                sourceStep: true,
                parameters: true
              }
            }
          }
        }
      }
    });
    
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    
    const stats = await calculateRecipeStats(id);
    res.json({ ...recipe, ...stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
};

export const updateRecipe = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description, yieldAmount, yieldUnit, isSubRecipe, isProduct, steps, bakingLossRate } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing items, step parameters, and steps
      await tx.recipeItem.deleteMany({ where: { recipeId: id } });
      const stepIds = (await tx.recipeStep.findMany({ where: { recipeId: id }, select: { id: true } })).map(s => s.id);
      if (stepIds.length > 0) {
        await tx.stepParameter.deleteMany({ where: { stepId: { in: stepIds } } });
      }
      await tx.recipeStep.deleteMany({ where: { recipeId: id } });
      
      // 2. Update recipe basic info
      await tx.recipe.update({
        where: { id },
        data: { 
          name, 
          description, 
          yieldAmount: yieldAmount || 1, 
          yieldUnit: yieldUnit || '份',
          isSubRecipe: !!isSubRecipe,
          isProduct: isProduct === undefined ? true : !!isProduct,
          bakingLossRate: bakingLossRate !== undefined ? parseFloat(bakingLossRate) || 0 : 0
        }
      });

      // 3. Recreate steps and items with proper clientId → dbId mapping
      await createStepsWithItems(tx, id, steps || []);

      return tx.recipe.findUnique({
        where: { id },
        include: { steps: { include: { items: true, parameters: true } } }
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    });
    
    res.json(result);
  } catch (error) {
    console.error('Update Recipe Error:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
};

export const updateRecipeLabelConfig = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { labelConfig } = req.body;

    const updated = await prisma.recipe.update({
      where: { id },
      data: { labelConfig }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update Recipe Label Config Error:', error);
    res.status(500).json({ error: 'Failed to save label settings' });
  }
};

export const deleteRecipe = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Check if this recipe is used as a sub-recipe in other recipes
    const usages = await prisma.recipeItem.findMany({
      where: { subRecipeId: id },
      include: { recipe: true }
    });

    if (usages.length > 0) {
      const parentRecipeNames = Array.from(new Set(usages.map(u => u.recipe?.name).filter(Boolean)));
      return res.status(400).json({
        error: `此食譜正被其他食譜（${parentRecipeNames.join('、')}）引用為子食譜，無法刪除。請先至上述食譜中移除此子食譜。`
      });
    }

    await prisma.$transaction(async (tx) => {
      const stepIds = (await tx.recipeStep.findMany({ where: { recipeId: id }, select: { id: true } })).map(s => s.id);
      await tx.recipeItem.deleteMany({ where: { recipeId: id } });
      if (stepIds.length > 0) {
        await tx.stepParameter.deleteMany({ where: { stepId: { in: stepIds } } });
      }
      await tx.recipeStep.deleteMany({ where: { recipeId: id } });
      await tx.recipe.delete({ where: { id } });
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete Recipe Error:', error);
    res.status(500).json({ error: '刪除食譜失敗' });
  }
};
