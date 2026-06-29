import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

const createReservationSchema = z.object({
  locationId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().min(1).max(50),
  comment: z.string().optional(),
});

const updateReservationSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED']).optional(),
  tableId: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  partySize: z.number().int().min(1).max(50).optional(),
  comment: z.string().nullable().optional(),
});

export async function createReservation(req: Request, res: Response): Promise<void> {
  const parsed = createReservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { locationId, date, time, partySize, comment } = parsed.data;
  const customerId = (req as any).user?.id;

  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required for reservations' });
    return;
  }

  // Verify location exists and is active
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location || !location.isActive) {
    res.status(400).json({ success: false, error: 'Location not found or inactive' });
    return;
  }

  const reservation = await prisma.reservation.create({
    data: {
      customerId,
      locationId,
      date: new Date(date),
      time,
      partySize,
      comment,
    },
    include: {
      location: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, email: true } },
      table: true,
    },
  });

  // Emit event for automation rules
  try {
    const { appEvents } = await import('../lib/events.js');
    appEvents.emit('reservation.created', { reservation });
  } catch {}

  res.status(201).json({ success: true, data: reservation });
}

export async function listReservations(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const locationId = req.query.locationId as string | undefined;
  const date = req.query.date as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (locationId) where.locationId = locationId;
  if (date) where.date = new Date(date);

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        location: { select: { id: true, name: true } },
        table: { select: { id: true, name: true, capacity: true } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  res.json({
    success: true,
    data: reservations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getReservation(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      location: { select: { id: true, name: true } },
      table: { select: { id: true, name: true, capacity: true } },
    },
  });

  if (!reservation) {
    res.status(404).json({ success: false, error: 'Reservation not found' });
    return;
  }

  res.json({ success: true, data: reservation });
}

export async function updateReservation(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateReservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Reservation not found' });
    return;
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.tableId !== undefined) data.tableId = parsed.data.tableId;
  if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
  if (parsed.data.time !== undefined) data.time = parsed.data.time;
  if (parsed.data.partySize !== undefined) data.partySize = parsed.data.partySize;
  if (parsed.data.comment !== undefined) data.comment = parsed.data.comment;

  const reservation = await prisma.reservation.update({
    where: { id },
    data,
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      location: { select: { id: true, name: true } },
      table: { select: { id: true, name: true, capacity: true } },
    },
  });

  res.json({ success: true, data: reservation });
}

export async function deleteReservation(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Reservation not found' });
    return;
  }

  await prisma.reservation.delete({ where: { id } });
  res.json({ success: true, message: 'Reservation deleted' });
}

export async function listCustomerReservations(req: Request, res: Response): Promise<void> {
  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const where = { customerId };

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      include: {
        location: { select: { id: true, name: true } },
        table: { select: { id: true, name: true, capacity: true } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  res.json({
    success: true,
    data: reservations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function checkAvailability(req: Request, res: Response): Promise<void> {
  const { locationId, date, partySize } = req.query;

  if (!locationId || !date) {
    res.status(400).json({ success: false, error: 'locationId and date are required' });
    return;
  }

  const parsedSize = parseInt(partySize as string) || 2;

  // Get all tables at this location that can fit the party
  const tables = await prisma.table.findMany({
    where: {
      locationId: locationId as string,
      isActive: true,
      capacity: { gte: parsedSize },
    },
    orderBy: { capacity: 'asc' },
  });

  // Get existing reservations for that date at that location (non-cancelled)
  const existingReservations = await prisma.reservation.findMany({
    where: {
      locationId: locationId as string,
      date: new Date(date as string),
      status: { not: 'CANCELLED' },
    },
    select: { time: true, tableId: true },
  });

  // Generate time slots (e.g., 11:00 to 21:00, every 30 min)
  const slots: { time: string; available: boolean }[] = [];
  for (let h = 11; h <= 21; h++) {
    for (const m of ['00', '30']) {
      const time = `${String(h).padStart(2, '0')}:${m}`;
      // A slot is available if there are tables not reserved at that time
      const reservedTableIds = existingReservations
        .filter((r) => r.time === time && r.tableId)
        .map((r) => r.tableId);
      const availableTables = tables.filter((t) => !reservedTableIds.includes(t.id));
      slots.push({ time, available: availableTables.length > 0 });
    }
  }

  res.json({ success: true, data: { slots, totalTables: tables.length } });
}
