import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createLocationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-zA-Z0-9-]+$/, 'Slug must be alphanumeric with hyphens').toLowerCase(),
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
  owner: z.string().nullable().optional(),
  royaltyRate: z.number().optional(),
  apiEndpoint: z.string().nullable().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
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
  const reservationCount = await prisma.reservation.count({ where: { locationId: id } });

  if (orderCount > 0 || reservationCount > 0) {
    res.status(409).json({
      success: false,
      error: 'Cannot delete location with existing orders or reservations. Deactivate it instead.',
    });
    return;
  }

  try {
    await prisma.location.delete({ where: { id } });
  } catch (error: any) {
    if (error.code === 'P2003') {
      res.status(409).json({ success: false, error: 'Cannot delete location because it is still referenced by other records (e.g. inventory or mealtimes). Deactivate it instead.' });
      return;
    }
    throw error;
  }

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

  // Force Taiwan Time calculation
  const getTaiwanDate = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Taipei',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      weekday: 'short',
      hour12: false
    }).formatToParts(d);
    const m: any = {};
    parts.forEach(p => m[p.type] = p.value);
    
    const daysMap: any = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dayOfWeek = daysMap[m.weekday]; 
    const dateKey = `${m.year}-${String(m.month).padStart(2, '0')}-${String(m.day).padStart(2, '0')}`;
    return { dayOfWeek, dateKey, year: Number(m.year), month: Number(m.month), day: Number(m.day) };
  };

  const now = new Date();
  const taiwanNow = getTaiwanDate(now);
  console.log(`[Slots Debug] Storefront Request at Real Now: ${now.toISOString()} (Taiwan: ${taiwanNow.dateKey} weekday=${taiwanNow.dayOfWeek})`);

  const slotsByDay: any[] = [];
  const { generateDaySlots } = await import('../lib/business-hours.js');

  // Log all hours in DB for this location
  console.log(`[Slots Debug] DB Operating Hours for location ${location.id}:`);
  (location as any).operatingHours.forEach((h: any) => {
    console.log(`  - Day ${h.dayOfWeek}: ${h.openTime}-${h.closeTime} (isClosed: ${h.isClosed})`);
  });

  let allRawSlots: string[] = [];

  for (let i = -1; i < daysCount; i++) {
    const targetDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const { dayOfWeek } = getTaiwanDate(targetDate);
    
    const sessions = (location as any).operatingHours.filter((h: any) => h.dayOfWeek === dayOfWeek && !h.isClosed);
    
    if (sessions.length === 0) continue;

    const minStartTime = i <= 0 ? new Date(now.getTime() + leadTime * 60000) : undefined;

    const daySlots = generateDaySlots(
      targetDate,
      sessions,
      interval,
      { preOpeningBuffer, postClosingBuffer },
      minStartTime
    );

    allRawSlots.push(...daySlots);
  }

  // Deduplicate and sort all slots
  allRawSlots = Array.from(new Set(allRawSlots)).sort();

  // Group strictly by actual Calendar Date in Taiwan Time
  const groupedSlots: Record<string, string[]> = {};
  for (const slot of allRawSlots) {
    const slotDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(slot));
    if (!groupedSlots[slotDateStr]) {
      groupedSlots[slotDateStr] = [];
    }
    groupedSlots[slotDateStr].push(slot);
  }

  // Populate slotsByDay
  const sortedDates = Object.keys(groupedSlots).sort();
  for (const date of sortedDates) {
    slotsByDay.push({
      date,
      slots: groupedSlots[date],
    });
  }

  res.json({ success: true, data: slotsByDay });
}
