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

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: {
          select: { prices: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, contactPerson, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: '供應商名稱為必填' });

    const supplier = await prisma.supplier.create({
      data: { name, contactPerson, phone, address }
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, contactPerson, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: '供應商名稱為必填' });

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, contactPerson, phone, address }
    });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update supplier' });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Use transaction to delete quotes linked to this supplier first, then delete supplier
    await prisma.$transaction(async (tx) => {
      await tx.supplierPrice.deleteMany({ where: { supplierId: id } });
      await tx.supplier.delete({ where: { id } });
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete supplier', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
};

export const getSupplierPrices = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const prices = await prisma.supplierPrice.findMany({
      where: { supplierId: id },
      include: { ingredient: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch supplier prices' });
  }
};

export const addSupplierPrice = async (req: Request, res: Response) => {
  try {
    const { id, ingredientId, supplierId, packageSize, packageUnit, price } = req.body;
    if (!ingredientId || !supplierId || !packageSize || !packageUnit || price === undefined) {
      return res.status(400).json({ error: '所有欄位均為必填' });
    }

    // Fetch ingredient to resolve its base unit for dynamic multiplier
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId }
    });

    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });

    // Calculate dynamic base unit price using getUnitMultiplier helper
    const multiplier = getUnitMultiplier(packageUnit, ingredient.unit);
    const baseQty = Number(packageSize) * multiplier;
    const unitPrice = baseQty > 0 ? Number(price) / baseQty : 0;

    // If there is already a quote for this ingredient and supplier, update it, else create new
    let existing;
    if (id) {
      existing = await prisma.supplierPrice.findUnique({
        where: { id }
      });
    } else {
      existing = await prisma.supplierPrice.findFirst({
        where: { ingredientId, supplierId }
      });
    }

    let result;
    if (existing) {
      result = await prisma.supplierPrice.update({
        where: { id: existing.id },
        data: {
          packageSize: Number(packageSize),
          packageUnit,
          price: Number(price),
          unitPrice
        },
        include: { ingredient: true }
      });
    } else {
      result = await prisma.supplierPrice.create({
        data: {
          ingredientId,
          supplierId,
          packageSize: Number(packageSize),
          packageUnit,
          price: Number(price),
          unitPrice,
          isDefault: true // Make this new supplier quote default
        },
        include: { ingredient: true }
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Failed to add supplier price', error);
    res.status(500).json({ error: 'Failed to add supplier price' });
  }
};

export const deleteSupplierPrice = async (req: Request, res: Response) => {
  try {
    const priceId = req.params.priceId as string;
    await prisma.supplierPrice.delete({
      where: { id: priceId }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete supplier price' });
  }
};

export const setDefaultSupplierPrice = async (req: Request, res: Response) => {
  try {
    const priceId = req.params.priceId as string;
    
    // Find price to get its ingredientId
    const priceRecord = await prisma.supplierPrice.findUnique({
      where: { id: priceId }
    });
    
    if (!priceRecord) return res.status(404).json({ error: 'Price record not found' });
    
    // Set all quotes for this ingredient to not default, and this one to default
    await prisma.$transaction([
      prisma.supplierPrice.updateMany({
        where: { ingredientId: priceRecord.ingredientId },
        data: { isDefault: false }
      }),
      prisma.supplierPrice.update({
        where: { id: priceId },
        data: { isDefault: true }
      })
    ]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to set default supplier price', error);
    res.status(500).json({ error: 'Failed to set default supplier price' });
  }
};

