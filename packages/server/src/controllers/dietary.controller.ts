import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { autoTranslateDietaryPreference } from '../lib/translation-helper.js';

const createDietaryPreferenceSchema = z.object({
  name: z.string().min(1),
  nameTranslations: z.record(z.string()).optional(),
});

export async function listDietaryPreferences(_req: Request, res: Response): Promise<void> {
  const preferences = await prisma.dietaryPreference.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { menuItems: true } } },
  });

  res.json({ success: true, data: preferences });
}

export async function createDietaryPreference(req: Request, res: Response): Promise<void> {
  const parsed = createDietaryPreferenceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.dietaryPreference.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    res.status(409).json({ success: false, error: 'A dietary preference with this name already exists' });
    return;
  }

  const translatedData = await autoTranslateDietaryPreference(parsed.data);

  const preference = await prisma.dietaryPreference.create({ data: translatedData as any });
  res.status(201).json({ success: true, data: preference });
}

export async function deleteDietaryPreference(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.dietaryPreference.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Dietary preference not found' });
    return;
  }

  await prisma.dietaryPreference.delete({ where: { id } });
  res.json({ success: true, message: 'Dietary preference deleted' });
}
