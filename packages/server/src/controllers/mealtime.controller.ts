import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { autoTranslateMealtime } from '../lib/translation-helper.js';

const createMealtimeSchema = z.object({
  name: z.string().min(1),
  nameTranslations: z.record(z.string()).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
  days: z.array(z.number().int().min(0).max(6)).min(1),
  isActive: z.boolean().default(true),
  locationId: z.string().optional(),
});

const updateMealtimeSchema = createMealtimeSchema.partial();

export async function listMealtimes(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;

  const where: Record<string, unknown> = {};
  if (locationId) where.locationId = locationId;

  const mealtimes = await prisma.mealtime.findMany({
    where,
    orderBy: { startTime: 'asc' },
    include: { _count: { select: { menuItems: true } } },
  });

  res.json({ success: true, data: mealtimes });
}

export async function createMealtime(req: Request, res: Response): Promise<void> {
  const parsed = createMealtimeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const translatedData = await autoTranslateMealtime(parsed.data);

  const mealtime = await prisma.mealtime.create({ data: translatedData });
  res.status(201).json({ success: true, data: mealtime });
}

export async function updateMealtime(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateMealtimeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.mealtime.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Mealtime not found' });
    return;
  }

  const translatedData = await autoTranslateMealtime(parsed.data, existing);

  const mealtime = await prisma.mealtime.update({
    where: { id },
    data: translatedData,
  });

  res.json({ success: true, data: mealtime });
}

export async function deleteMealtime(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.mealtime.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Mealtime not found' });
    return;
  }

  await prisma.mealtime.delete({ where: { id } });
  res.json({ success: true, message: 'Mealtime deleted' });
}
