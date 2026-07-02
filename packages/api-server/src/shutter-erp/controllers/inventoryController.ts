import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const getInventoryLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      include: {
        ingredient: {
          select: {
            name: true,
            unit: true,
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(logs);
  } catch (error: any) {
    console.error('Failed to fetch inventory logs', error);
    res.status(500).json({ error: '獲取庫存紀錄失敗' });
  }
};

export const createInventoryLog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ingredientId, type, amount, reason, createExpense, supplierPriceId, manualCost } = req.body;

    if (!ingredientId || !type || amount === undefined) {
      return res.status(400).json({ error: '材料、類型與數量為必填欄位' });
    }

    if (amount <= 0 && type !== 'ADJUST') {
      return res.status(400).json({ error: '數量必須大於 0' });
    }

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId }
    });

    if (!ingredient) {
      return res.status(404).json({ error: '找不到該項材料' });
    }

    // Run database transaction to ensure atomic updates
    const result = await prisma.$transaction(async (tx) => {
      let newStock = ingredient.currentStock;

      if (type === 'IN') {
        newStock += Number(amount);
      } else if (type === 'OUT') {
        newStock -= Number(amount);
        if (newStock < 0) {
          throw new Error(`庫存不足，目前庫存僅剩 ${ingredient.currentStock} ${ingredient.unit}`);
        }
      } else if (type === 'ADJUST') {
        newStock = Number(amount);
        if (newStock < 0) {
          throw new Error('調整後庫存不能為負數');
        }
      } else {
        throw new Error('未知的異動類型，僅限 IN, OUT, ADJUST');
      }

      // 1. Update ingredient stock
      const updatedIngredient = await tx.ingredient.update({
        where: { id: ingredientId },
        data: { currentStock: newStock }
      });

      // 2. Create inventory log
      const log = await tx.inventoryLog.create({
        data: {
          ingredientId,
          type,
          amount: Number(amount),
          reason: reason || null
        },
        include: {
          ingredient: {
            select: {
              name: true,
              unit: true
            }
          }
        }
      });

      // 3. Create expense if requested
      let expense = null;
      if (type === 'IN' && createExpense) {
        let cost = 0;
        let supplierName = "";
        
        if (manualCost !== undefined && manualCost !== null) {
          cost = Number(manualCost);
          if (supplierPriceId) {
             const sp = await tx.supplierPrice.findUnique({ where: { id: supplierPriceId }, include: { supplier: true }});
             if (sp?.supplier?.name) supplierName = ` (${sp.supplier.name})`;
          }
        } else {
          let priceSource = null;
          if (supplierPriceId) {
            priceSource = await tx.supplierPrice.findUnique({
              where: { id: supplierPriceId },
              include: { supplier: true }
            });
          } else {
            priceSource = await tx.supplierPrice.findFirst({
              where: { ingredientId, isDefault: true },
              include: { supplier: true }
            });
          }
          
          if (priceSource) {
            cost = priceSource.unitPrice * Number(amount);
            if (priceSource.supplier?.name) {
              supplierName = ` (${priceSource.supplier.name})`;
            }
          }
        }
        
        expense = await tx.expense.create({
          data: {
            amount: cost,
            description: `進貨: ${ingredient.name} ${amount}${ingredient.unit}${supplierName}`,
            inventoryLogId: log.id,
            status: 'PENDING'
          }
        });
      }

      return { updatedIngredient, log, expense };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Failed to create inventory log', error);
    res.status(500).json({ error: error.message || '更新庫存失敗' });
  }
};
