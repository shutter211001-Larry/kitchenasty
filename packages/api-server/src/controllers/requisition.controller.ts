import { Request, Response } from "express";
import prisma from "../lib/db.js";
import { tenantStorage } from "../middleware/tenantStorage.js"; // Ensure tenant isolation

export const getBranchInventory = async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const { locationId } = req.query;

    if (!locationId) return res.status(400).json({ error: "locationId is required" });

    const inventory = await prisma.locationInventory.findMany({
      where: { tenantId, locationId: String(locationId) },
      include: { ingredient: true },
    });

    res.json(inventory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getBranchRequisitions = async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const { locationId } = req.query;

    if (!locationId) return res.status(400).json({ error: "locationId is required" });

    const requisitions = await prisma.requisition.findMany({
      where: { tenantId, locationId: String(locationId) },
      include: {
        items: { include: { ingredient: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(requisitions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createRequisition = async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const { locationId, items, expectedDate } = req.body;

    if (!locationId || !items || !items.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const reqData = items.map((i: any) => ({
      ingredientId: i.ingredientId,
      quantity: Number(i.quantity),
    }));

    const requisition = await prisma.requisition.create({
      data: {
        tenantId,
        locationId,
        status: "PENDING",
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        items: {
          create: reqData,
        },
      },
    });

    res.json({ success: true, data: requisition });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const receiveRequisition = async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const requisition = await prisma.requisition.findUnique({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!requisition) return res.status(404).json({ error: "Not found" });
    if (requisition.status !== "SHIPPED") {
      return res.status(400).json({ error: "Can only receive SHIPPED requisitions" });
    }

    await prisma.$transaction(async (tx: any) => {
      // Add stock to branch location inventory
      for (const item of requisition.items) {
        if (item.fulfilledQty > 0) {
          await tx.locationInventory.upsert({
            where: {
              locationId_ingredientId: {
                locationId: requisition.locationId,
                ingredientId: item.ingredientId,
              },
            },
            create: {
              tenantId,
              locationId: requisition.locationId,
              ingredientId: item.ingredientId,
              currentStock: item.fulfilledQty,
            },
            update: {
              currentStock: { increment: item.fulfilledQty },
            },
          });
        }
      }

      await tx.requisition.update({
        where: { id },
        data: { status: "RECEIVED" },
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTenantIngredients = async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const ingredients = await prisma.ingredient.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    res.json(ingredients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
