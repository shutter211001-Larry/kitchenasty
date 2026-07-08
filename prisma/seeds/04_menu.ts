import { PrismaClient } from '@prisma/client';

export async function seedMenu(prisma: PrismaClient) {
  console.log('Seeding Menu...');

  const location = await prisma.location.findUnique({ where: { slug: 'xinyi-branch' } });
  if (!location) throw new Error("Location 'xinyi-branch' not found for menu seeding.");

  // Create allergens
  const allergens = await Promise.all(
    ['Gluten', 'Dairy', 'Nuts', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'Sesame'].map(
      (name) => prisma.allergen.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const allergenMap = Object.fromEntries(allergens.map(a => [a.name, a.id]));

  // Mealtimes
  const lunch = await prisma.mealtime.createManyAndReturn({
    data: [{
      name: 'Lunch',
      startTime: '11:00',
      endTime: '15:00',
      days: [1, 2, 3, 4, 5],
      locationId: location.id,
    }],
    skipDuplicates: true,
  });

  const dinner = await prisma.mealtime.createManyAndReturn({
    data: [{
      name: 'Dinner',
      startTime: '17:00',
      endTime: '22:00',
      days: [0, 1, 2, 3, 4, 5, 6],
      locationId: location.id,
    }],
    skipDuplicates: true,
  });

  // Get mealtime IDs
  const lunchId = await prisma.mealtime.findFirst({ where: { name: 'Lunch', locationId: location.id } });
  const dinnerId = await prisma.mealtime.findFirst({ where: { name: 'Dinner', locationId: location.id } });

  // Categories
  const categories = await Promise.all([
    { name: '開胃小點', slug: 'appetizers', sortOrder: 1, isFrozenDelivery: false },
    { name: '主廚推薦', slug: 'main-courses', sortOrder: 2, isFrozenDelivery: false },
    { name: '經典披薩', slug: 'pizzas', sortOrder: 3, isFrozenDelivery: false },
    { name: '冷凍生鮮宅配', slug: 'frozen', sortOrder: 4, isFrozenDelivery: true },
  ].map(cat => prisma.category.upsert({
    where: { slug: cat.slug },
    update: {},
    create: { ...cat, locationId: location.id, tenantId: 'demo-tenant-id' }
  })));
  const catMap = Object.fromEntries(categories.map(c => [c.slug, c.id]));

  // Menu items with options
  const margherita = await prisma.menuItem.upsert({
    where: { slug: 'margherita-pizza' },
    update: {},
    create: {
      name: '經典瑪格麗特披薩',
      slug: 'margherita-pizza',
      description: '使用聖馬札諾番茄醬、新鮮水牛莫札瑞拉起司與九層塔，經典道地義式風味。',
      price: 280,
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop',
      categoryId: catMap['pizzas'],
      locationId: location.id,
      tenantId: 'demo-tenant-id',
      sortOrder: 1,
    },
  });

  // Pizza size option
  await prisma.menuOption.createMany({
    data: [
      {
        menuItemId: margherita.id,
        name: '尺寸',
        displayType: 'RADIO',
        isRequired: true,
      }
    ],
    skipDuplicates: true,
  });

  const sizeOption = await prisma.menuOption.findFirst({ where: { menuItemId: margherita.id, name: '尺寸' } });
  if (sizeOption) {
    await prisma.menuOptionValue.createMany({
      data: [
        { menuOptionId: sizeOption.id, name: '10吋 (小)', priceModifier: 0, isDefault: true, sortOrder: 1 },
        { menuOptionId: sizeOption.id, name: '12吋 (中)', priceModifier: 60, sortOrder: 2 },
      ],
      skipDuplicates: true,
    });
  }

  // Frozen Item
  const frozenPizza = await prisma.menuItem.upsert({
    where: { slug: 'frozen-beef-noodle' },
    update: {},
    create: {
      name: '招牌紅燒牛肉麵 (3入組)',
      slug: 'frozen-beef-noodle',
      description: '嚴選澳洲牛腱心，慢火熬煮12小時的濃郁紅燒湯頭。急速冷凍包裝，讓您在家也能享用主廚好手藝。',
      price: 850,
      image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cb438?w=600&h=400&fit=crop',
      categoryId: catMap['frozen'],
      locationId: location.id,
      tenantId: 'demo-tenant-id',
      sortOrder: 1,
      orderType: 'FROZEN_DELIVERY',
    },
  });

  // Allergen associations
  await prisma.menuItemAllergen.createMany({
    data: [
      { menuItemId: margherita.id, allergenId: allergenMap['Gluten'] },
      { menuItemId: margherita.id, allergenId: allergenMap['Dairy'] },
      { menuItemId: frozenPizza.id, allergenId: allergenMap['Gluten'] },
      { menuItemId: frozenPizza.id, allergenId: allergenMap['Dairy'] },
    ],
    skipDuplicates: true,
  });

  // Mealtime associations
  if (lunchId && dinnerId) {
    await prisma.menuItemMealtime.createMany({
      data: [
        { menuItemId: margherita.id, mealtimeId: lunchId.id },
        { menuItemId: margherita.id, mealtimeId: dinnerId.id },
      ],
      skipDuplicates: true,
    });
  }
}
