import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../lib/db.js';
import { generateToken } from '../middleware/auth.js';
import { tenantStorage } from '../middleware/tenantStorage.js';
import { grantRegistrationBonus } from '../lib/registrationBonus.js';
import { sendEmail, staffPasswordResetEmail } from '../lib/email.js';
import jwt from 'jsonwebtoken';

// ============================================================
// STAFF AUTH
// ============================================================

const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function getSetupStatus(req: Request, res: Response): Promise<void> {
  try {
    const adminCount = await tenantStorage.run({ tenantId: null }, async () => {
      return await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    });
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

  const issueToken = (user: any) => {
    const token = generateToken({
      id: user.id,
      email: user.email,
      type: 'staff',
      role: user.role,
      tenantId: user.tenantId,
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
          tenantId: user.tenantId,
          hasErpAccess: process.env.SINGLE_TENANT_MODE === 'true' ? true : user.tenant?.hasErpAccess,
        },
      },
    });
  };

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Environment variable override for Super Admin (prioritizes env over DB checks)
  if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
    console.log(`[AUTH DEBUG] Super admin env override triggered for: ${email}`);
    let superAdmin = await tenantStorage.run({ tenantId: null }, async () => {
      return await prisma.user.findFirst({
        where: { email: adminEmail, role: 'SUPER_ADMIN', tenantId: null }
      });
    });

    if (!superAdmin) {
      console.log(`[AUTH DEBUG] Super admin not found in DB. Creating dynamically...`);
      const adminHash = await bcrypt.hash(adminPassword, 10);
      superAdmin = await tenantStorage.run({ tenantId: null }, async () => {
        return await prisma.user.create({
          data: {
            email: adminEmail,
            name: '系統管理員',
            password: adminHash,
            role: 'SUPER_ADMIN'
          }
        });
      });
    }

    return issueToken(superAdmin);
  }

  const requestTenantId = tenantStorage.getStore()?.tenantId || null;

  // Search for ALL users globally with this email
  const users = await tenantStorage.run({ tenantId: null }, async () => {
    return await prisma.user.findMany({ 
      where: { email },
      include: { tenant: { select: { id: true, name: true, domain: true, hasErpAccess: true } } }
    });
  });

  if (!users || users.length === 0) {
    console.log(`[AUTH DEBUG] User not found for email: "${email}"`);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  // Filter valid accounts
  const validUsers = [];
  for (const u of users) {
    if (u.isActive && await bcrypt.compare(password, u.password)) {
      validUsers.push(u);
    }
  }

  if (validUsers.length === 0) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  // If specifically targeting a tenant via subdomain
  if (requestTenantId) {
    const targetUser = validUsers.find(u => u.tenantId === requestTenantId);
    if (!targetUser) {
      res.status(401).json({ success: false, error: 'Invalid credentials for this domain' });
      return;
    }
    return issueToken(targetUser);
  }

  // Universal portal login
  if (validUsers.length === 1) {
    return issueToken(validUsers[0]);
  }

  const superAdmin = validUsers.find(u => u.role === 'SUPER_ADMIN');
  if (superAdmin) {
    return issueToken(superAdmin);
  }

  // Needs tenant selection
  const selectToken = jwt.sign({ email }, process.env.JWT_SECRET || 'dev-secret-change-me', { expiresIn: '15m' });
  
  res.json({
    success: true,
    needsTenantSelection: true,
    loginSessionToken: selectToken,
    availableTenants: validUsers.map(u => ({
      id: u.tenantId,
      name: u.tenant?.name || '未命名餐廳',
      domain: u.tenant?.domain || '',
    }))
  });
}

const staffSelectTenantSchema = z.object({
  loginSessionToken: z.string(),
  tenantId: z.string(),
});

export async function staffSelectTenant(req: Request, res: Response): Promise<void> {
  const parsed = staffSelectTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid input parameters' });
    return;
  }

  const { loginSessionToken, tenantId } = parsed.data;

  try {
    const decoded = jwt.verify(loginSessionToken, process.env.JWT_SECRET || 'dev-secret-change-me') as { email: string };
    const { email } = decoded;

    // Find the specific user account for this tenant
    const user = await tenantStorage.run({ tenantId: null }, async () => {
      return await prisma.user.findFirst({
        where: { email, tenantId },
        include: { tenant: { select: { hasErpAccess: true } } }
      });
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Access denied to this tenant' });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      type: 'staff',
      role: user.role,
      tenantId: user.tenantId,
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
          tenantId: user.tenantId,
          hasErpAccess: process.env.SINGLE_TENANT_MODE === 'true' ? true : user.tenant?.hasErpAccess,
        },
      },
    });

  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired session token' });
  }
}

const staffRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, 'Password must be at least 8 characters and include at least one letter and one number'),
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

  const requestTenantId = tenantStorage.getStore()?.tenantId || null;
  const existing = await prisma.user.findFirst({ where: { email, tenantId: requestTenantId } });
  if (existing) {
    res.status(409).json({ success: false, error: 'Email already registered for this tenant' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role: role || 'STAFF' },
    select: { id: true, email: true, name: true, role: true, tenantId: true },
  });

  const token = generateToken({
    id: user.id,
    email: user.email,
    type: 'staff',
    role: user.role,
    tenantId: user.tenantId,
  });

  res.status(201).json({ success: true, data: { token, user } });
}

// ============================================================
// CUSTOMER AUTH
// ============================================================

export async function requestStaffPasswordReset(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: '電子郵件為必填項目' });
      return;
    }

    const requestTenantId = tenantStorage.getStore()?.tenantId || null;

    const user = await prisma.user.findFirst({
      where: { 
        email,
        tenantId: requestTenantId // explicitly forces null if requestTenantId is null
      },
      include: { tenant: true },
    });
    if (!user) {
      // 為了安全性，不透露信箱是否存在
      res.status(200).json({ message: '如果信箱存在，密碼重置信已寄出。' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.staffPasswordResetToken.create({
      data: {
        token,
        email: user.email,
        expiresAt
      }
    });

    let adminUrl = process.env.ADMIN_URL_PUBLIC || process.env.ADMIN_URL || 'http://localhost:5173';
    if (user.tenant && user.tenant.domain) {
      const { getTenantUrls } = await import('../utils/url.js');
      const protocol = user.tenant.domain.includes('localhost') ? 'http' : 'https';
      adminUrl = getTenantUrls(user.tenant.domain, protocol).adminUrl;
    }
    const resetLink = `${adminUrl.replace(/\/+$/, '')}/reset-password?token=${token}`;
    
    const emailContent = staffPasswordResetEmail({ email, resetLink });
    
    if (user.role === 'SUPER_ADMIN') {
      // 強制使用 SaaS 平台 (Global) 的信箱設定來發送老闆的密碼重置信，
      // 避免因單一租戶 (老闆) 的 SMTP 設定錯誤導致無法收到密碼重置信
      tenantStorage.run({ tenantId: null }, () => {
        sendEmail({ to: email, ...emailContent });
      });
    } else {
      // 一般員工 (MANAGER, STAFF) 則依照他們所屬餐廳的信箱設定發送
      sendEmail({ to: email, ...emailContent });
    }

    res.status(200).json({ message: '密碼重置信已寄出。' });
  } catch (error) {
    console.error('Staff password reset request failed', error);
    res.status(500).json({ error: '發送密碼重置信件失敗' });
  }
}

export async function resetStaffPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: '無效的請求：缺少必要參數' });
      return;
    }

    const resetToken = await prisma.staffPasswordResetToken.findUnique({ where: { token } });
    if (!resetToken) {
      res.status(400).json({ error: '無效的重置連結' });
      return;
    }

    if (resetToken.expiresAt < new Date()) {
      res.status(400).json({ error: '重置連結已過期' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { email: resetToken.email },
        data: { password: passwordHash }
      }),
      prisma.staffPasswordResetToken.delete({
        where: { id: resetToken.id }
      })
    ]);

    res.status(200).json({ message: '密碼重置成功' });
  } catch (error) {
    console.error('Staff password reset failed', error);
    res.status(500).json({ error: '密碼重置失敗' });
  }
}

const customerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, 'Password must be at least 8 characters and include at least one letter and one number'),
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

  const requestTenantId = tenantStorage.getStore()?.tenantId || null;
  const existing = await prisma.customer.findFirst({ where: { email, tenantId: requestTenantId } });
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
    tenantId: tenantStorage.getStore()?.tenantId || null,
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

  const requestTenantId = tenantStorage.getStore()?.tenantId || null;
  const customer = await prisma.customer.findFirst({ where: { email, tenantId: requestTenantId } });

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
    tenantId: tenantStorage.getStore()?.tenantId || null,
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
    const { tenantStorage } = await import('../middleware/tenantStorage.js');
    
    // We must search globally because SUPER_ADMIN has tenantId = null
    const user = await tenantStorage.run({ tenantId: null }, async () => {
      return await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, lineUserId: true, lineDisplayName: true, locationId: true, preferredLanguage: true, tenantId: true, tenant: { select: { hasErpAccess: true } } },
      });
    });
    
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }
    
    const requestTenantId = tenantStorage.getStore()?.tenantId || null;
    
    // Ensure the user actually belongs to this tenant, unless they are a Super Admin
    if (user.role !== 'SUPER_ADMIN') {
      if (requestTenantId && user.tenantId !== requestTenantId) {
        res.status(401).json({ success: false, error: 'User tenant mismatch' });
        return;
      }
    }
    
    res.json({ success: true, data: { type: 'staff', user: { ...user, hasErpAccess: process.env.SINGLE_TENANT_MODE === 'true' ? true : user.tenant?.hasErpAccess } } });
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

  const schema = z.object({ password: z.string().regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, 'Password must be at least 8 characters and include at least one letter and one number') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid password' });
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

export async function updateLanguage(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'staff') {
    res.status(401).json({ success: false, error: 'Not authenticated as staff' });
    return;
  }

  const schema = z.object({ language: z.string().min(2) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid language code' });
    return;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { preferredLanguage: parsed.data.language },
      select: { id: true, preferredLanguage: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update language preference' });
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
    const requestTenantId = tenantStorage.getStore()?.tenantId || null;
    const sourceUser = await prisma.customer.findFirst({
      where: provider === 'google' ? { googleId: socialId, tenantId: requestTenantId } : { lineUserId: socialId, tenantId: requestTenantId },
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
