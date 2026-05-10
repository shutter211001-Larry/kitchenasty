import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { generateToken } from '../middleware/auth.js';

// ============================================================
// STAFF AUTH
// ============================================================

const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function staffLogin(req: Request, res: Response): Promise<void> {
  const parsed = staffLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid email or password format' });
    return;
  }

  const { email, password } = parsed.data;
  console.log(`[AUTH DEBUG] Attempting login for email: "${email}"`);

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log(`[AUTH DEBUG] User not found for email: "${email}"`);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  console.log(`[AUTH DEBUG] User found: ID=${user.id}, Role=${user.role}, IsActive=${user.isActive}`);

  if (!user.isActive) {
    console.log(`[AUTH DEBUG] Login failed: User is not active`);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  console.log(`[AUTH DEBUG] Password validation result: ${valid}`);

  if (!valid) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    type: 'staff',
    role: user.role,
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lineUserId: user.lineUserId,
        lineDisplayName: user.lineDisplayName,
        googleId: user.googleId,
        googleEmail: user.googleEmail,
        hasPassword: !!user.password,
      },
    },
  });
}

const staffRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['SUPER_ADMIN', 'MANAGER', 'STAFF']).optional(),
});

export async function staffRegister(req: Request, res: Response): Promise<void> {
  const parsed = staffRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { email, password, name, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, error: 'Email already registered' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role: role || 'STAFF' },
    select: { id: true, email: true, name: true, role: true },
  });

  const token = generateToken({
    id: user.id,
    email: user.email,
    type: 'staff',
    role: user.role,
  });

  res.status(201).json({ success: true, data: { token, user } });
}

// ============================================================
// CUSTOMER AUTH
// ============================================================

const customerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().optional(),
});

export async function customerRegister(req: Request, res: Response): Promise<void> {
  const parsed = customerRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { email, password, name, phone } = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, error: 'Email already registered' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const customer = await prisma.customer.create({
    data: { email, password: hashedPassword, name, phone },
    select: { id: true, email: true, name: true, phone: true },
  });

  // Link previous guest orders to this new account
  await prisma.order.updateMany({
    where: { guestEmail: email, customerId: null },
    data: { customerId: customer.id },
  });

  const token = generateToken({
    id: customer.id,
    email: customer.email,
    type: 'customer',
  });

  res.status(201).json({ success: true, data: { token, customer } });
}

const customerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function customerLogin(req: Request, res: Response): Promise<void> {
  const parsed = customerLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid email or password format' });
    return;
  }

  const { email, password } = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer || !customer.password) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, customer.password);
  if (!valid) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const token = generateToken({
    id: customer.id,
    email: customer.email,
    type: 'customer',
  });

  res.json({
    success: true,
    data: {
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        lineUserId: customer.lineUserId,
        lineDisplayName: customer.lineDisplayName,
        googleId: customer.googleId,
        googleEmail: customer.googleEmail,
        hasPassword: !!customer.password,
      },
    },
  });
}

// ============================================================
// SHARED
// ============================================================

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  if (req.user.type === 'staff') {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, lineUserId: true, lineDisplayName: true },
    });
    res.json({ success: true, data: { type: 'staff', user } });
  } else {
    const customer = await prisma.customer.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, phone: true, lineUserId: true, lineDisplayName: true, googleId: true, googleEmail: true, password: true },
    });
    const customerData = { ...customer, hasPassword: !!customer?.password };
    if (customerData) delete (customerData as any).password;
    res.json({ success: true, data: { type: 'customer', customer: customerData } });
  }
}
export async function deleteMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  try {
    if (req.user.type === 'customer') {
      await prisma.customer.delete({ where: { id: req.user.id } });
      res.json({ success: true, message: 'Account deleted successfully' });
    } else {
      res.status(403).json({ success: false, error: 'Staff accounts cannot be deleted here' });
    }
  } catch (err) {
    console.error('[DELETE ACCOUNT ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
}

export async function setPassword(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  const schema = z.object({ password: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    return;
  }

  const customer = await prisma.customer.findUnique({ where: { id: req.user.id } });
  if (customer?.password) {
    res.status(400).json({ success: false, error: 'Password already set. Please use change password instead.' });
    return;
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  await prisma.customer.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  res.json({ success: true, message: 'Password set successfully' });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  const schema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  try {
    const updated = await prisma.customer.update({
      where: { id: req.user.id },
      data: parsed.data,
      select: { id: true, email: true, name: true, phone: true, lineUserId: true, lineDisplayName: true, googleId: true, googleEmail: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
}

export async function unbindGoogle(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  try {
    await prisma.customer.update({
      where: { id: req.user.id },
      data: { 
        googleId: null,
        googleEmail: null 
      }
    });

    res.json({ success: true, message: 'Google account unlinked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to unlink Google account' });
  }
}
