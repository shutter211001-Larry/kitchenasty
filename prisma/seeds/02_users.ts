import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedUsers(prisma: PrismaClient) {
  console.log('Seeding Users...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@shutter.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
  
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminHashedPassword,
      name: '平台管理員',
      role: 'SUPER_ADMIN',
      isActive: true,
      preferredLanguage: 'zh-TW',
    },
  });

  // Create demo user
  const demoHashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'demo@shutter.com' },
    update: {},
    create: {
      id: 'demo-account-id',
      email: 'demo@shutter.com',
      password: demoHashedPassword,
      name: '王店長 (Demo)',
      role: 'MANAGER',
      isActive: true,
      preferredLanguage: 'zh-TW',
      tenantId: 'demo-tenant-id',
    },
  });

  // Create staff user
  await prisma.user.upsert({
    where: { email: 'staff@shutter.com' },
    update: {},
    create: {
      email: 'staff@shutter.com',
      password: demoHashedPassword,
      name: '陳店員',
      role: 'STAFF',
      isActive: true,
      hourlyWage: 180,
      salaryType: 'HOURLY',
      preferredLanguage: 'zh-TW',
      tenantId: 'demo-tenant-id',
    },
  });

  // Create customer group
  await prisma.customerGroup.upsert({
    where: { name: '一般會員' },
    update: {},
    create: { name: '一般會員', tenantId: 'demo-tenant-id' },
  });

  const vipGroup = await prisma.customerGroup.upsert({
    where: { name: 'VIP會員' },
    update: {},
    create: { name: 'VIP會員', tenantId: 'demo-tenant-id' },
  });

  // Create a customer
  const customerPassword = await bcrypt.hash('customer123', 10);
  await prisma.customer.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: customerPassword,
      name: '王大明',
      phone: '0912-345-678',
      groupId: vipGroup.id,
      loyaltyPoints: 100,
      tenantId: 'demo-tenant-id',
    },
  });
}

