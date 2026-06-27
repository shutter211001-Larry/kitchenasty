import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';
import { validateAndCalculateDiscount } from '../lib/discount-engine.js';

const createCouponSchema = z.object({
  code: z.string().min(1).max(50).nullable().optional(),
  name: z.string().min(1).optional(),
  isAutomatic: z.boolean().optional(),
  conditions: z.any().nullable().optional(),
  locationId: z.string().nullable().optional(),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_DELIVERY', 'BOGO']),
  value: z.number().min(0),
  minOrder: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomer: z.number().int().min(1).optional(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateCouponSchema = createCouponSchema.partial();

export async function createCoupon(req: Request, res: Response): Promise<void> {
  const parsed = createCouponSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { startsAt, expiresAt, code, ...rest } = parsed.data;

  // Check code uniqueness only if code is provided
  if (code) {
    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Coupon code already exists' });
      return;
    }
  }

  const coupon = await prisma.coupon.create({
    data: {
      ...rest,
      code: code ? code.toUpperCase() : null,
      startsAt: startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  auditLog(req, { action: 'create', entity: 'Coupon', entityId: coupon.id, details: { code: coupon.code } });

  res.status(201).json({ success: true, data: coupon });
}

export async function listCoupons(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.coupon.count(),
  ]);

  res.json({
    success: true,
    data: coupons,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getCoupon(req: Request<{ id: string }>, res: Response): Promise<void> {
  const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!coupon) {
    res.status(404).json({ success: false, error: 'Coupon not found' });
    return;
  }
  res.json({ success: true, data: coupon });
}

export async function updateCoupon(req: Request<{ id: string }>, res: Response): Promise<void> {
  const parsed = updateCouponSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Coupon not found' });
    return;
  }

  const { startsAt, expiresAt, code, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (code !== undefined) {
    if (code !== null) {
      const upperCode = code.toUpperCase();
      if (existing.code !== upperCode) {
        const dup = await prisma.coupon.findUnique({ where: { code: upperCode } });
        if (dup) {
          res.status(409).json({ success: false, error: 'Coupon code already exists' });
          return;
        }
      }
      data.code = upperCode;
    } else {
      data.code = null;
    }
  }
  if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null;
  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const coupon = await prisma.coupon.update({
    where: { id: req.params.id },
    data,
  });

  auditLog(req, { action: 'update', entity: 'Coupon', entityId: req.params.id, details: data });

  res.json({ success: true, data: coupon });
}

export async function deleteCoupon(req: Request<{ id: string }>, res: Response): Promise<void> {
  const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Coupon not found' });
    return;
  }

  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
  } catch (error: any) {
    if (error.code === 'P2003') {
      res.status(409).json({ success: false, error: 'Cannot delete this coupon because it is already associated with existing orders. You can disable it instead.' });
      return;
    }
    throw error;
  }

  auditLog(req, { action: 'delete', entity: 'Coupon', entityId: req.params.id, details: { code: existing.code } });
  res.json({ success: true, message: 'Coupon deleted' });
}

export async function validateCoupon(req: Request, res: Response): Promise<void> {
  const { code, subtotal, items = [], orderType = 'PICKUP', locationId = '' } = req.body;

  if (!code) {
    res.status(400).json({ success: false, error: 'Coupon code is required' });
    return;
  }

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon) {
    res.status(404).json({ success: false, error: 'Invalid coupon code' });
    return;
  }

  const result = validateAndCalculateDiscount(
    coupon,
    {
      subtotal: subtotal || 0,
      orderType,
      locationId,
    },
    items
  );

  if (!result.isValid) {
    res.status(400).json({ success: false, error: result.reason || 'Coupon validation failed' });
    return;
  }

  res.json({
    success: true,
    data: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount: result.discountAmount,
      freeDelivery: result.freeDelivery,
    },
  });
}
