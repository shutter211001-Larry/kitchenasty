import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const dayTypeEnum = z.enum(['WORKDAY', 'REST_DAY', 'REGULAR_OFF', 'NATIONAL_HOLIDAY']);

const upsertShiftSchema = z.object({
  userId: z.string().min(1),
  locationId: z.string().min(1),
  jobRoleId: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  dayType: dayTypeEnum,
});

const upsertAvailabilitySchema = z.object({
  userId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const createShiftRequirementSchema = z.object({
  locationId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  jobRoleId: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  count: z.number().int().min(1),
});

// ============================================================
// HANDLERS (SHIFTS)
// ============================================================

export async function listShifts(req: Request, res: Response): Promise<void> {
  const { locationId, startDate, endDate, userId } = req.query;

  const where: any = {};
  if (locationId) where.locationId = locationId;
  if (userId) where.userId = userId;
  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
  }

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      jobRole: { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
  });

  res.json({ success: true, data: shifts });
}

export async function upsertShift(req: Request, res: Response): Promise<void> {
  const parsed = upsertShiftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid data', details: parsed.error.errors });
    return;
  }

  const { userId, locationId, date, ...rest } = parsed.data;
  const targetDate = new Date(date);

  // We find if a shift already exists for this user on this day at this location
  // Note: One user per location per day has ONE shift record (which can be a workday, rest day, etc.)
  // If they work multiple chunks, they might need multiple shifts, but for simplicity we assume one shift record per day.
  
  const existing = await prisma.shift.findFirst({
    where: { userId, locationId, date: targetDate },
  });

  let shift;
  if (existing) {
    shift = await prisma.shift.update({
      where: { id: existing.id },
      data: { ...rest },
      include: { user: true, jobRole: true },
    });
  } else {
    shift = await prisma.shift.create({
      data: {
        userId,
        locationId,
        date: targetDate,
        ...rest,
      },
      include: { user: true, jobRole: true },
    });
  }

  res.json({ success: true, data: shift });
}

export async function deleteShift(req: Request<{ id: string }>, res: Response): Promise<void> {
  await prisma.shift.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Shift deleted' });
}

// ============================================================
// HANDLERS (AVAILABILITY)
// ============================================================

export async function listAvailabilities(req: Request, res: Response): Promise<void> {
  const { userId } = req.query;
  const where = userId ? { userId: userId as string } : undefined;

  const availabilities = await prisma.userAvailability.findMany({
    where,
    orderBy: { dayOfWeek: 'asc' },
  });

  res.json({ success: true, data: availabilities });
}

export async function saveAvailabilities(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    userId: z.string().min(1),
    availabilities: z.array(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
    })),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid data', details: parsed.error.errors });
    return;
  }

  const { userId, availabilities } = parsed.data;

  // Replace all availabilities for this user
  await prisma.$transaction(async (tx) => {
    await tx.userAvailability.deleteMany({ where: { userId } });
    if (availabilities.length > 0) {
      await tx.userAvailability.createMany({
        data: availabilities.map(a => ({
          userId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      });
    }
  });

  res.json({ success: true, message: 'Availabilities saved' });
}

// ============================================================
// HANDLERS (REQUIREMENTS)
// ============================================================

export async function listRequirements(req: Request, res: Response): Promise<void> {
  const { locationId, startDate, endDate } = req.query;

  const where: any = {};
  if (locationId) where.locationId = locationId;
  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
  }

  const reqs = await prisma.shiftRequirement.findMany({
    where,
    include: { jobRole: true },
    orderBy: { date: 'asc' },
  });

  res.json({ success: true, data: reqs });
}

export async function saveRequirements(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    locationId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    requirements: z.array(z.object({
      jobRoleId: z.string().min(1),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      count: z.number().int().min(1),
    })),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid data', details: parsed.error.errors });
    return;
  }

  const { locationId, date, requirements } = parsed.data;
  const targetDate = new Date(date);

  await prisma.$transaction(async (tx) => {
    await tx.shiftRequirement.deleteMany({ where: { locationId, date: targetDate } });
    if (requirements.length > 0) {
      await tx.shiftRequirement.createMany({
        data: requirements.map(r => ({
          locationId,
          date: targetDate,
          jobRoleId: r.jobRoleId,
          startTime: r.startTime,
          endTime: r.endTime,
          count: r.count,
        })),
      });
    }
  });

  res.json({ success: true, message: 'Requirements saved for date' });
}
