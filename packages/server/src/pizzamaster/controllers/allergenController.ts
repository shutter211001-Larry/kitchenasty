import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getAllergens = async (req: Request, res: Response) => {
  try {
    const allergens = await prisma.allergen.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(allergens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch allergens' });
  }
};

export const createAllergen = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: '過敏原名稱為必填' });
    }

    const trimmedName = name.trim();
    // Check duplication
    const existing = await prisma.allergen.findUnique({
      where: { name: trimmedName }
    });

    if (existing) {
      return res.status(400).json({ error: '該過敏原名稱已存在' });
    }

    const allergen = await prisma.allergen.create({
      data: { name: trimmedName }
    });

    res.status(201).json(allergen);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create allergen' });
  }
};

export const deleteAllergen = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.allergen.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete allergen' });
  }
};
