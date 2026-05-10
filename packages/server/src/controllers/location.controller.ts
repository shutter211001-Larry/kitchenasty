import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createLocationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().default('US'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
  deliveryEnabled: z.boolean().default(true),
  pickupEnabled: z.boolean().default(true),
  minOrderDelivery: z.number().min(0).default(0),
  minOrderPickup: z.number().min(0).default(0),
  deliveryLeadTime: z.number().int().min(0).default(30),
  pickupLeadTime: z.number().int().min(0).default(15),
  isBusy: z.boolean().optional(),
  busyMessage: z.string().nullable().optional(),
  operatingHours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: z.string().regex(/^\d{2}:\d{2}$/),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/),
    isClosed: z.boolean().default(false),
  })).optional(),
});

const updateLocationSchema = createLocationSchema.partial().omit({ slug: true });

// ============================================================
// HANDLERS
// ============================================================

export async function listLocations(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const [locations, total] = await Promise.all([
    prisma.location.findMany({
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { deliveryZones: true, tables: true, orders: true } },
      },
    }),
    prisma.location.count(),
  ]);

  res.json({
    success: true,
    data: locations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getLocation(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      operatingHours: { orderBy: { dayOfWeek: 'asc' } },
      deliveryZones: { orderBy: { name: 'asc' } },
      tables: { orderBy: { name: 'asc' } },
      _count: { select: { orders: true, reservations: true, menuItems: true } },
    },
  });

  if (!location) {
    res.status(404).json({ success: false, error: 'Location not found' });
    return;
  }

  res.json({ success: true, data: location });
}

export async function createLocation(req: Request, res: Response): Promise<void> {
  const parsed = createLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { operatingHours, ...data } = parsed.data;

  const existing = await prisma.location.findUnique({ where: { slug: data.slug } });
  if (existing) {
    res.status(409).json({ success: false, error: 'A location with this slug already exists' });
    return;
  }

  const location = await prisma.location.create({
    data: {
      ...data,
      operatingHours: operatingHours ? {
        create: operatingHours,
      } : undefined,
    },
    include: {
      operatingHours: { orderBy: { dayOfWeek: 'asc' } },
    },
  });

  auditLog(req, { action: 'create', entity: 'Location', entityId: location.id, details: { name: location.name } });

  res.status(201).json({ success: true, data: location });
}

export async function updateLocation(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Location not found' });
    return;
  }

  const { operatingHours, ...data } = parsed.data;

  const location = await prisma.location.update({
    where: { id },
    data: {
      ...data,
      operatingHours: operatingHours ? {
        deleteMany: {},
        create: operatingHours,
      } : undefined,
    },
    include: {
      operatingHours: { orderBy: { dayOfWeek: 'asc' } },
    },
  });

  auditLog(req, { action: 'update', entity: 'Location', entityId: id, details: data });

  res.json({ success: true, data: location });
}

export async function deleteLocation(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.location.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ success: false, error: 'Location not found' });
    return;
  }

  const orderCount = await prisma.order.count({ where: { locationId: id } });

  if (orderCount > 0) {
    res.status(409).json({
      success: false,
      error: 'Cannot delete location with existing orders. Deactivate it instead.',
    });
    return;
  }

  await prisma.location.delete({ where: { id } });
  auditLog(req, { action: 'delete', entity: 'Location', entityId: id, details: { name: existing.name } });
  res.json({ success: true, message: 'Location deleted' });
}
export async function getAvailableSlots(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const orderType = (req.query.orderType as string || 'PICKUP').toUpperCase();
  const daysCount = parseInt(req.query.days as string) || 7;

  const [location, settings] = await Promise.all([
    prisma.location.findUnique({
      where: { id },
      include: { operatingHours: true },
    }),
    prisma.siteSettings.findUnique({ where: { id: 'default' } }),
  ]);

  if (!location) {
    res.status(404).json({ success: false, error: 'Location not found' });
    return;
  }

  const orderSettings = (settings?.orderSettings as any) || {};
  const preOpeningBuffer = Number(orderSettings.preOpeningBuffer || 30);
  const postClosingBuffer = Number(orderSettings.postClosingBuffer || 30);
  const interval = Number(orderSettings.timeSlotInterval || 15);
  const leadTime = orderType === 'DELIVERY' ? (location.deliveryLeadTime || 45) : (location.pickupLeadTime || 15);

  const now = new Date();
  const slotsByDay: any[] = [];

  const { generateDaySlots } = await import('../lib/business-hours.js');

  for (let i = 0; i < daysCount; i++) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + i);
    const dayOfWeek = targetDate.getDay();
    const sessions = (location as any).operatingHours.filter((h: any) => h.dayOfWeek === dayOfWeek && !h.isClosed);
    if (sessions.length === 0) continue;

    const minStartTime = i === 0 ? new Date(now.getTime() + leadTime * 60000) : undefined;

    const daySlots = generateDaySlots(
      targetDate,
      sessions,
      interval,
      { preOpeningBuffer, postClosingBuffer },
      minStartTime
    );

    if (daySlots.length > 0) {
      // Use local date (YYYY-MM-DD) instead of ISO UTC to avoid timezone shift grouping issues
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      slotsByDay.push({
        date: dateKey,
        slots: daySlots,
      });
    }
  }

  res.json({ success: true, data: slotsByDay });
}
