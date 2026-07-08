import { PrismaClient, OrderStatus } from '@prisma/client';

export async function seedOrders(prisma: PrismaClient) {
  console.log('Seeding Orders & Transactions...');

  const location = await prisma.location.findUnique({ where: { slug: 'xinyi-branch' } });
  const customer = await prisma.customer.findUnique({ where: { email: 'customer@example.com' } });
  const margherita = await prisma.menuItem.findUnique({ where: { slug: 'margherita-pizza' } });
  const table = await prisma.table.findFirst({ where: { locationId: location?.id } });

  if (!location || !customer || !margherita) return;

  // Coupons
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: 'PERCENTAGE',
      value: 10,
      minOrder: 200,
      maxDiscount: 150,
      usageLimit: 1000,
      perCustomer: 1,
      isActive: true,
      tenantId: 'demo-tenant-id',
    },
  });

  // Group Order Session
  if (table) {
    const groupSession = await prisma.groupOrderSession.create({
      data: {
        pin: '1234',
        locationId: location.id,
        tableId: table.id,
        status: 'ACTIVE',
        tenantId: 'demo-tenant-id',
      },
    });

    // Sample Group Order
    await prisma.order.upsert({
      where: { orderNumber: 'SH-SEED-GRP-001' },
      update: {},
      create: {
        orderNumber: 'SH-SEED-GRP-001',
        customerId: customer.id,
        locationId: location.id,
        orderType: 'PICKUP',
        status: 'PENDING',
        subtotal: 280,
        total: 280,
        tax: 0,
        groupId: groupSession.id,
        tableId: table.id,
        tenantId: 'demo-tenant-id',
        items: {
          create: [
            {
              menuItemId: margherita.id,
              name: '經典瑪格麗特披薩',
              quantity: 1,
              unitPrice: 280,
              subtotal: 280,
            },
          ],
        },
      },
    });
  }

  // Sample Frozen Order
  const frozenPizza = await prisma.menuItem.findUnique({ where: { slug: 'frozen-beef-noodle' } });
  if (frozenPizza) {
    await prisma.order.upsert({
      where: { orderNumber: 'SH-SEED-FRZ-001' },
      update: {},
      create: {
        orderNumber: 'SH-SEED-FRZ-001',
        customerId: customer.id,
        locationId: location.id,
        orderType: 'FROZEN_DELIVERY',
        status: 'CONFIRMED',
        frozenDeliveryMethod: '711_FROZEN',
        subtotal: 850,
        deliveryFee: 150,
        total: 1000,
        logisticsProvider: '711',
        trackingNumber: '711-TRACK-123',
        tenantId: 'demo-tenant-id',
        items: {
          create: [{
            menuItemId: frozenPizza.id,
            name: frozenPizza.name,
            quantity: 1,
            unitPrice: 850,
            subtotal: 850,
          }],
        },
      },
    });
  }
}
