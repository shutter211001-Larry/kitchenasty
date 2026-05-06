import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { sendEmail } from '../lib/email.js';
import { auditLog } from '../lib/audit.js';

// ============================================================
// LIST CUSTOMERS
// ============================================================

export async function listCustomers(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const search = req.query.search as string | undefined;
  const isGuest = req.query.isGuest as string | undefined;
  const groupId = req.query.groupId as string | undefined;

  const where: any = {};
  if (isGuest !== undefined) {
    where.isGuest = isGuest === 'true';
  }
  if (groupId) {
    where.groupId = groupId;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isGuest: true,
        loyaltyPoints: true,
        createdAt: true,
        groupId: true,
        group: { select: { id: true, name: true } },
        _count: {
          select: { orders: true, reservations: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({
    success: true,
    data: customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ============================================================
// GET CUSTOMER
// ============================================================

export async function getCustomer(req: Request<{ id: string }>, res: Response): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      group: true,
      addresses: true,
      _count: {
        select: { orders: true, reservations: true }
      }
    },
  });

  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  // Remove password from response
  const { password, ...safeCustomer } = customer;

  res.json({ success: true, data: safeCustomer });
}

// ============================================================
// UPDATE CUSTOMER
// ============================================================

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  loyaltyPoints: z.number().int().optional(),
  isGuest: z.boolean().optional(),
});

export async function updateCustomer(req: Request<{ id: string }>, res: Response): Promise<void> {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const targetId = req.params.id;

  const existing = await prisma.customer.findUnique({ where: { id: targetId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  const customer = await prisma.customer.update({
    where: { id: targetId },
    data: parsed.data,
  });

  auditLog(req, { action: 'update', entity: 'Customer', entityId: targetId, details: parsed.data });

  const { password, ...safeCustomer } = customer;
  res.json({ success: true, data: safeCustomer });
}

// ============================================================
// DELETE CUSTOMER
// ============================================================

export async function deleteCustomer(req: Request<{ id: string }>, res: Response): Promise<void> {
  const targetId = req.params.id;

  const existing = await prisma.customer.findUnique({ where: { id: targetId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  await prisma.customer.delete({
    where: { id: targetId },
  });

  auditLog(req, { action: 'delete', entity: 'Customer', entityId: targetId });

  res.json({ success: true, data: { message: 'Customer deleted' } });
}

// ============================================================
// SEND PROMOTIONAL EMAIL
// ============================================================

const promoEmailSchema = z.object({
  customerIds: z.array(z.string()).optional(), // Optional: if empty, send to ALL non-guest customers
  subject: z.string().min(1),
  content: z.string().min(1),
});

export async function sendPromotionalEmail(req: Request, res: Response): Promise<void> {
  const parsed = promoEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { customerIds, subject, content } = parsed.data;

  const where: any = { isGuest: false };
  if (customerIds && customerIds.length > 0) {
    where.id = { in: customerIds };
  }

  const customers = await prisma.customer.findMany({
    where,
    select: { email: true, name: true }
  });

  if (customers.length === 0) {
    res.status(404).json({ success: false, error: 'No customers found to send email' });
    return;
  }

  // Send emails (in a real app, this should be a background job)
  const results = await Promise.allSettled(
    customers.map(c => 
      sendEmail({
        to: c.email,
        subject,
        html: `<div>
          <h1>Hello ${c.name},</h1>
          ${content}
        </div>`,
        text: `Hello ${c.name},\n\n${content}`,
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  auditLog(req, { 
    action: 'create', 
    entity: 'PromotionalEmail', 
    details: { subject, recipientCount: customers.length, successful, failed } 
  });

  res.json({
    success: true,
    data: {
      message: `Sent promotional emails: ${successful} successful, ${failed} failed`,
      totalRecipients: customers.length,
      successful,
      failed
    }
  });
}
