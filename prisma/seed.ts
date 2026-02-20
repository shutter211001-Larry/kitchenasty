import { PrismaClient, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@kitchenasty.com' },
    update: {},
    create: {
      email: 'admin@kitchenasty.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  // Create a customer
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.customer.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: customerPassword,
      name: 'John Doe',
      phone: '(555) 987-6543',
    },
  });

  // Create allergens
  const allergens = await Promise.all(
    ['Gluten', 'Dairy', 'Nuts', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'Sesame'].map(
      (name) => prisma.allergen.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  // Create customer group
  const regularGroup = await prisma.customerGroup.upsert({
    where: { name: 'Regular' },
    update: {},
    create: { name: 'Regular' },
  });

  // Create location
  const location = await prisma.location.upsert({
    where: { slug: 'downtown' },
    update: {},
    create: {
      name: 'Downtown Kitchen',
      slug: 'downtown',
      description: 'Our flagship location in the heart of downtown',
      phone: '(555) 123-4567',
      email: 'downtown@kitchenasty.com',
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'US',
      lat: 37.7749,
      lng: -122.4194,
      deliveryEnabled: true,
      pickupEnabled: true,
      minOrderDelivery: 15,
      minOrderPickup: 0,
      deliveryLeadTime: 35,
      pickupLeadTime: 15,
    },
  });

  // Operating hours (Mon-Sun, 10am-10pm)
  for (let day = 0; day <= 6; day++) {
    await prisma.operatingHour.upsert({
      where: { locationId_dayOfWeek: { locationId: location.id, dayOfWeek: day } },
      update: {},
      create: {
        locationId: location.id,
        dayOfWeek: day,
        openTime: '10:00',
        closeTime: '22:00',
        isClosed: false,
      },
    });
  }

  // Delivery zones
  await prisma.deliveryZone.create({
    data: {
      locationId: location.id,
      name: 'Zone 1 - Nearby',
      charge: 3.99,
      minOrder: 15,
      isActive: true,
    },
  });

  await prisma.deliveryZone.create({
    data: {
      locationId: location.id,
      name: 'Zone 2 - Extended',
      charge: 6.99,
      minOrder: 25,
      isActive: true,
    },
  });

  // Mealtimes
  const lunch = await prisma.mealtime.create({
    data: {
      name: 'Lunch',
      startTime: '11:00',
      endTime: '15:00',
      days: [1, 2, 3, 4, 5],
      locationId: location.id,
    },
  });

  const dinner = await prisma.mealtime.create({
    data: {
      name: 'Dinner',
      startTime: '17:00',
      endTime: '22:00',
      days: [0, 1, 2, 3, 4, 5, 6],
      locationId: location.id,
    },
  });

  // Categories
  const appetizers = await prisma.category.upsert({
    where: { slug: 'appetizers' },
    update: {},
    create: { name: 'Appetizers', slug: 'appetizers', sortOrder: 1, locationId: location.id },
  });

  const mains = await prisma.category.upsert({
    where: { slug: 'main-courses' },
    update: {},
    create: { name: 'Main Courses', slug: 'main-courses', sortOrder: 2, locationId: location.id },
  });

  const pizzas = await prisma.category.upsert({
    where: { slug: 'pizzas' },
    update: {},
    create: { name: 'Pizzas', slug: 'pizzas', sortOrder: 3, locationId: location.id },
  });

  const desserts = await prisma.category.upsert({
    where: { slug: 'desserts' },
    update: {},
    create: { name: 'Desserts', slug: 'desserts', sortOrder: 4, locationId: location.id },
  });

  const drinks = await prisma.category.upsert({
    where: { slug: 'drinks' },
    update: {},
    create: { name: 'Drinks', slug: 'drinks', sortOrder: 5, locationId: location.id },
  });

  // Menu items with options
  const bruschetta = await prisma.menuItem.upsert({
    where: { slug: 'bruschetta' },
    update: {},
    create: {
      name: 'Bruschetta',
      slug: 'bruschetta',
      description: 'Toasted bread topped with fresh tomatoes, garlic, basil, and olive oil',
      price: 8.99,
      categoryId: appetizers.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  const caesarSalad = await prisma.menuItem.upsert({
    where: { slug: 'caesar-salad' },
    update: {},
    create: {
      name: 'Caesar Salad',
      slug: 'caesar-salad',
      description: 'Crisp romaine lettuce with Caesar dressing, croutons, and parmesan',
      price: 10.99,
      categoryId: appetizers.id,
      locationId: location.id,
      sortOrder: 2,
    },
  });

  // Caesar salad size option
  const sizeOption = await prisma.menuOption.create({
    data: {
      menuItemId: caesarSalad.id,
      name: 'Size',
      displayType: 'RADIO',
      isRequired: true,
      values: {
        create: [
          { name: 'Regular', priceModifier: 0, isDefault: true, sortOrder: 1 },
          { name: 'Large', priceModifier: 3.00, sortOrder: 2 },
        ],
      },
    },
  });

  // Caesar salad add-ons
  await prisma.menuOption.create({
    data: {
      menuItemId: caesarSalad.id,
      name: 'Add Protein',
      displayType: 'CHECKBOX',
      isRequired: false,
      maxSelect: 3,
      values: {
        create: [
          { name: 'Grilled Chicken', priceModifier: 4.00, sortOrder: 1 },
          { name: 'Shrimp', priceModifier: 6.00, sortOrder: 2 },
          { name: 'Salmon', priceModifier: 7.00, sortOrder: 3 },
        ],
      },
    },
  });

  const grilledSalmon = await prisma.menuItem.upsert({
    where: { slug: 'grilled-salmon' },
    update: {},
    create: {
      name: 'Grilled Salmon',
      slug: 'grilled-salmon',
      description: 'Atlantic salmon fillet with lemon butter sauce, seasonal vegetables, and rice',
      price: 22.99,
      categoryId: mains.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  const margherita = await prisma.menuItem.upsert({
    where: { slug: 'margherita-pizza' },
    update: {},
    create: {
      name: 'Margherita Pizza',
      slug: 'margherita-pizza',
      description: 'Classic pizza with tomato sauce, fresh mozzarella, and basil',
      price: 14.99,
      categoryId: pizzas.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  // Pizza size option
  await prisma.menuOption.create({
    data: {
      menuItemId: margherita.id,
      name: 'Size',
      displayType: 'RADIO',
      isRequired: true,
      values: {
        create: [
          { name: '10" Small', priceModifier: 0, isDefault: true, sortOrder: 1 },
          { name: '12" Medium', priceModifier: 3.00, sortOrder: 2 },
          { name: '14" Large', priceModifier: 6.00, sortOrder: 3 },
        ],
      },
    },
  });

  // Pizza extra toppings
  await prisma.menuOption.create({
    data: {
      menuItemId: margherita.id,
      name: 'Extra Toppings',
      displayType: 'CHECKBOX',
      isRequired: false,
      maxSelect: 5,
      values: {
        create: [
          { name: 'Mushrooms', priceModifier: 1.50, sortOrder: 1 },
          { name: 'Olives', priceModifier: 1.50, sortOrder: 2 },
          { name: 'Peppers', priceModifier: 1.50, sortOrder: 3 },
          { name: 'Pepperoni', priceModifier: 2.00, sortOrder: 4 },
          { name: 'Extra Cheese', priceModifier: 2.00, sortOrder: 5 },
        ],
      },
    },
  });

  const tiramisu = await prisma.menuItem.upsert({
    where: { slug: 'tiramisu' },
    update: {},
    create: {
      name: 'Tiramisu',
      slug: 'tiramisu',
      description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream',
      price: 9.99,
      categoryId: desserts.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  const lemonade = await prisma.menuItem.upsert({
    where: { slug: 'fresh-lemonade' },
    update: {},
    create: {
      name: 'Fresh Lemonade',
      slug: 'fresh-lemonade',
      description: 'Freshly squeezed lemonade with mint',
      price: 4.99,
      categoryId: drinks.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  // Allergen associations
  await prisma.menuItemAllergen.createMany({
    data: [
      { menuItemId: bruschetta.id, allergenId: allergens.find(a => a.name === 'Gluten')!.id },
      { menuItemId: caesarSalad.id, allergenId: allergens.find(a => a.name === 'Dairy')!.id },
      { menuItemId: caesarSalad.id, allergenId: allergens.find(a => a.name === 'Eggs')!.id },
      { menuItemId: grilledSalmon.id, allergenId: allergens.find(a => a.name === 'Fish')!.id },
      { menuItemId: margherita.id, allergenId: allergens.find(a => a.name === 'Gluten')!.id },
      { menuItemId: margherita.id, allergenId: allergens.find(a => a.name === 'Dairy')!.id },
      { menuItemId: tiramisu.id, allergenId: allergens.find(a => a.name === 'Gluten')!.id },
      { menuItemId: tiramisu.id, allergenId: allergens.find(a => a.name === 'Dairy')!.id },
      { menuItemId: tiramisu.id, allergenId: allergens.find(a => a.name === 'Eggs')!.id },
    ],
    skipDuplicates: true,
  });

  // Mealtime associations
  await prisma.menuItemMealtime.createMany({
    data: [
      { menuItemId: bruschetta.id, mealtimeId: lunch.id },
      { menuItemId: bruschetta.id, mealtimeId: dinner.id },
      { menuItemId: caesarSalad.id, mealtimeId: lunch.id },
      { menuItemId: caesarSalad.id, mealtimeId: dinner.id },
      { menuItemId: grilledSalmon.id, mealtimeId: dinner.id },
      { menuItemId: margherita.id, mealtimeId: lunch.id },
      { menuItemId: margherita.id, mealtimeId: dinner.id },
      { menuItemId: tiramisu.id, mealtimeId: lunch.id },
      { menuItemId: tiramisu.id, mealtimeId: dinner.id },
      { menuItemId: lemonade.id, mealtimeId: lunch.id },
      { menuItemId: lemonade.id, mealtimeId: dinner.id },
    ],
    skipDuplicates: true,
  });

  // Tables
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { locationId_name: { locationId: location.id, name: `Table ${i}` } },
      update: {},
      create: {
        locationId: location.id,
        name: `Table ${i}`,
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
      },
    });
  }

  // Coupons
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: 'PERCENTAGE',
      value: 10,
      minOrder: 20,
      maxDiscount: 15,
      usageLimit: 1000,
      perCustomer: 1,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'FREEDELIVERY' },
    update: {},
    create: {
      code: 'FREEDELIVERY',
      type: 'FREE_DELIVERY',
      value: 0,
      minOrder: 30,
      usageLimit: 500,
      perCustomer: 3,
      isActive: true,
    },
  });

  // Sample orders
  const orderStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'PICKED_UP'];
  const orderTypes = ['DELIVERY', 'PICKUP'] as const;
  for (let i = 0; i < 15; i++) {
    const status = orderStatuses[i % orderStatuses.length];
    const orderType = orderTypes[i % 2];
    const daysAgo = Math.floor(i / 2);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(10 + (i % 12), (i * 17) % 60);

    await prisma.order.create({
      data: {
        orderNumber: `KA-SEED-${String(i + 1).padStart(3, '0')}`,
        customerId: customer.id,
        locationId: location.id,
        orderType,
        status,
        subtotal: 20 + i * 5,
        tax: (20 + i * 5) * 0.08,
        deliveryFee: orderType === 'DELIVERY' ? 4.99 : 0,
        total: (20 + i * 5) * 1.08 + (orderType === 'DELIVERY' ? 4.99 : 0),
        createdAt,
        items: {
          create: [
            {
              menuItemId: margherita.id,
              name: 'Margherita Pizza',
              quantity: 1 + (i % 3),
              unitPrice: 14.99,
              subtotal: 14.99 * (1 + (i % 3)),
            },
            ...(i % 2 === 0 ? [{
              menuItemId: lemonade.id,
              name: 'Fresh Lemonade',
              quantity: 2,
              unitPrice: 4.99,
              subtotal: 9.98,
            }] : []),
          ],
        },
      },
    });
  }

  // Sample reviews
  await prisma.review.createMany({
    data: [
      { customerId: customer.id, locationId: location.id, orderId: undefined, rating: 5, comment: 'Excellent food and fast delivery!', isApproved: true },
      { customerId: customer.id, locationId: location.id, orderId: undefined, rating: 4, comment: 'Great pizza, will order again.', isApproved: true },
      { customerId: customer.id, locationId: location.id, orderId: undefined, rating: 5, comment: 'Best restaurant in town!', isApproved: false },
    ],
    skipDuplicates: true,
  });

  // Sample reservation
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await prisma.reservation.create({
    data: {
      customerId: customer.id,
      locationId: location.id,
      date: tomorrow,
      time: '19:00',
      partySize: 4,
      status: 'PENDING',
    },
  });

  console.log('Seed completed successfully!');
  console.log('');
  console.log('Admin login: admin@kitchenasty.com / admin123');
  console.log('Customer login: customer@example.com / customer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
