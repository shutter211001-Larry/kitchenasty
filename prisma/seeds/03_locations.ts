import { PrismaClient } from '@prisma/client';

export async function seedLocations(prisma: PrismaClient) {
  console.log('Seeding Locations...');

  // Create location
  const location = await prisma.location.upsert({
    where: { slug: 'xinyi-branch' },
    update: {},
    create: {
      name: '信義旗艦店',
      slug: 'xinyi-branch',
      description: '位於信義區心臟地帶，提供最新鮮的地中海與在地結合創意料理，享受溫馨舒適的用餐環境。',
      phone: '02-8765-4321',
      email: 'xinyi@shutter.com',
      address: '信義路五段7號',
      city: '台北市',
      state: '信義區',
      postalCode: '110',
      country: 'TW',
      lat: 25.033964,
      lng: 121.564468,
      deliveryEnabled: true,
      pickupEnabled: true,
      minOrderDelivery: 300,
      minOrderPickup: 0,
      deliveryLeadTime: 35,
      pickupLeadTime: 15,
      tenantId: 'demo-tenant-id',
    },
  });

  // Operating hours (Mon-Sun, 10am-10pm)
  for (let day = 0; day <= 6; day++) {
    const existingHour = await prisma.operatingHour.findFirst({
      where: { locationId: location.id, dayOfWeek: day },
    });

    if (existingHour) {
      await prisma.operatingHour.update({
        where: { id: existingHour.id },
        data: {
          openTime: '10:00',
          closeTime: '22:00',
          isClosed: false,
        },
      });
    } else {
      await prisma.operatingHour.create({
        data: {
          locationId: location.id,
          dayOfWeek: day,
          openTime: '10:00',
          closeTime: '22:00',
          isClosed: false,
        },
      });
    }
  }

  // Delivery zones
  await prisma.deliveryZone.createMany({
    data: [
      {
        locationId: location.id,
        name: '區域 1 - 近距離 (3公里內)',
        charge: 50,
        minOrder: 300,
        isActive: true,
      },
      {
        locationId: location.id,
        name: '區域 2 - 遠距離 (3-8公里)',
        charge: 100,
        minOrder: 500,
        isActive: true,
      }
    ],
    skipDuplicates: true,
  });

  // Tables
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { locationId_name: { locationId: location.id, name: `第 ${i} 桌` } },
      update: {},
      create: {
        locationId: location.id,
        name: `第 ${i} 桌`,
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
      },
    });
  }

  // Assign staff to location (for Attendance and Chat)
  const staffUsers = await prisma.user.findMany({
    where: { role: { in: ['STAFF', 'MANAGER'] } }
  });

  for (const staff of staffUsers) {
    await prisma.user.update({
      where: { id: staff.id },
      data: { locationId: location.id }
    });
  }
}
