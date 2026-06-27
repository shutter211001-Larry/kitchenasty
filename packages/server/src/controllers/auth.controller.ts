import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { generateToken } from '../middleware/auth.js';
import { grantRegistrationBonus } from '../lib/registrationBonus.js';

// ============================================================
// STAFF AUTH
// ============================================================

const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function getSetupStatus(req: Request, res: Response): Promise<void> {
  try {
    const adminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    res.json({ hasSuperAdmin: adminCount > 0 });
  } catch (err) {
    res.status(500).json({ error: '獲取系統初始化狀態失敗' });
  }
}

export async function staffLogin(req: Request, res: Response): Promise<void> {
  const parsed = staffLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid email or password format' });
    return;
  }

  const { email, password } = parsed.data;
  console.log(`[AUTH DEBUG] Attempting login for email: "${email}"`);

  // Auto-seed default administrator if the user table is empty
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('Seeding default administrator admin@shutter.com / admin123...');
    const adminHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@shutter.com',
        name: '系統管理員',
        password: adminHash,
        role: 'SUPER_ADMIN'
      }
    });
  }

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
  address: z.string().optional(),
});

export async function customerRegister(req: Request, res: Response): Promise<void> {
  const parsed = customerRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { email, password, name, phone, address } = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, error: 'Email already registered' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const customer = await prisma.customer.create({
    data: { email, password: hashedPassword, name, phone, address },
    select: { id: true, email: true, name: true, phone: true, address: true, isEmployee: true },
  });

  // Link previous guest orders to this new account
  await prisma.order.updateMany({
    where: { guestEmail: email, customerId: null },
    data: { customerId: customer.id },
  });

  // Grant one-time registration bonus (anti-wash protected)
  await grantRegistrationBonus(customer.id, 'email', email);

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
        address: customer.address,
        lineUserId: customer.lineUserId,
        lineDisplayName: customer.lineDisplayName,
        googleId: customer.googleId,
        googleEmail: customer.googleEmail,
        isEmployee: customer.isEmployee,
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
      select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, lineUserId: true, lineDisplayName: true, locationId: true },
    });
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: { type: 'staff', user } });
  } else {
    const customer = await prisma.customer.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, email: true, name: true, phone: true, address: true,
        lineUserId: true, lineDisplayName: true, 
        googleId: true, googleEmail: true, 
        password: true,
        isEmployee: true,
        emailNotificationsEnabled: true,
        lineNotificationsEnabled: true
      },
    });
    if (!customer) {
      res.status(401).json({ success: false, error: 'Customer not found' });
      return;
    }
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
      try {
        console.log(`[Delete] Attempting to delete customer ID: ${req.user.id}`);
        await prisma.customer.delete({ where: { id: req.user.id } });
      } catch (e: any) {
        if (e.code === 'P2025') {
          console.warn(`[Delete] Customer ID ${req.user.id} already gone or not found.`);
        } else {
          throw e;
        }
      }
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
    address: z.string().optional(),
    emailNotificationsEnabled: z.boolean().optional(),
    lineNotificationsEnabled: z.boolean().optional(),
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
      select: { 
        id: true, email: true, name: true, phone: true, address: true,
        lineUserId: true, lineDisplayName: true, 
        googleId: true, googleEmail: true,
        isEmployee: true,
        emailNotificationsEnabled: true,
        lineNotificationsEnabled: true
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function mergeSocialAccount(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { provider, socialId, password } = req.body;
  if (!provider || !socialId) {
    res.status(400).json({ success: false, error: 'Missing required fields (provider, socialId)' });
    return;
  }

  try {
    // 1. SECURITY CHECK: Verify current user's password
    const currentUser = await prisma.customer.findUnique({ where: { id: req.user.id } });
    
    if (!currentUser) {
      res.status(401).json({ success: false, error: '目前登入身份無效' });
      return;
    }
    
    // 1. IDENTITY VERIFICATION: Either via Password OR Social Re-auth
    // (If password provided, we verify it. If not, we rely on the social re-auth completed in the frontend)
    if (password) {
      if (!currentUser.password) {
        res.status(400).json({ success: false, error: '此帳號尚未設定密碼，請使用社交重新驗證方式。' });
        return;
      }
      const isPasswordValid = await bcrypt.compare(password, currentUser.password);
      if (!isPasswordValid) {
        res.status(401).json({ success: false, error: '密碼錯誤，身份驗證失敗' });
        return;
      }
    } else {
      // If no password provided, it means the user chose to re-verify their social identity.
      // The frontend calls this after successful OAuth/LIFF re-authentication.
      console.log(`[Merge] Proceeding with password-free merge for ${provider} ID: ${socialId}`);
    }

    // 2. FIND SOURCE ACCOUNT: The one that currently holds the social link
    const sourceUser = await prisma.customer.findUnique({
      where: provider === 'google' ? { googleId: socialId } : { lineUserId: socialId },
    });

    if (!sourceUser) {
      res.status(404).json({ success: false, error: '找不到待整合的社交帳號' });
      return;
    }

    if (sourceUser.id === currentUser.id) {
      res.status(400).json({ success: false, error: '帳號已在目前的連結中' });
      return;
    }

      // 3. TRANSACTIONAL MERGE: Move orders, points, and transfer link
    await prisma.$transaction(async (tx) => {
      // Transfer Orders
      await tx.order.updateMany({
        where: { customerId: sourceUser.id },
        data: { customerId: currentUser.id },
      });

      // Transfer Points (Additive logic on the customer record)
      const pointsToMove = sourceUser.loyaltyPoints || 0;
      if (pointsToMove !== 0) {
        // Add to current user
        await tx.customer.update({
          where: { id: currentUser.id },
          data: { loyaltyPoints: { increment: pointsToMove } },
        });

        // Create a transaction log for the merge
        await tx.loyaltyTransaction.create({
          data: {
            customerId: currentUser.id,
            type: 'ADJUST',
            points: pointsToMove,
            description: `Account Merge from ${sourceUser.email}`,
          },
        });

        // Zero out source user (since we are unlinking/potentially deleting)
        await tx.customer.update({
          where: { id: sourceUser.id },
          data: { loyaltyPoints: 0 },
        });
      }

      // Transfer Loyalty Transactions
      await tx.loyaltyTransaction.updateMany({
        where: { customerId: sourceUser.id },
        data: { customerId: currentUser.id },
      });

      // Transfer Reservations
      await tx.reservation.updateMany({
        where: { customerId: sourceUser.id },
        data: { customerId: currentUser.id },
      });

      // Transfer Reviews
      await tx.review.updateMany({
        where: { customerId: sourceUser.id },
        data: { customerId: currentUser.id },
      });

      // Transfer Addresses
      await tx.address.updateMany({
        where: { customerId: sourceUser.id },
        data: { customerId: currentUser.id },
      });

      // Unbind social ID from source
      await tx.customer.update({
        where: { id: sourceUser.id },
        data: provider === 'google' 
          ? { googleId: null, googleEmail: null } 
          : { lineUserId: null, lineDisplayName: null },
      });

      // Bind social ID to current user
      await tx.customer.update({
        where: { id: currentUser.id },
        data: provider === 'google' 
          ? { googleId: socialId, googleEmail: (sourceUser as any).googleEmail } 
          : { lineUserId: socialId, lineDisplayName: (sourceUser as any).lineDisplayName },
      });

      // 4. FINAL STEP: Delete the now-empty source account
      console.log(`[Merge] Successfully transferred data. Now deleting source account: ${sourceUser.id}`);
      await tx.customer.delete({
        where: { id: sourceUser.id }
      });
      console.log(`[Merge] Source account ${sourceUser.id} deleted successfully.`);
    });

    res.json({ success: true, message: '帳號整合完成，您的訂單與紅利已同步。' });
  } catch (err: any) {
    console.error('Merge Account Error:', err);
    res.status(500).json({ success: false, error: err.message || '整合過程中發生錯誤' });
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
