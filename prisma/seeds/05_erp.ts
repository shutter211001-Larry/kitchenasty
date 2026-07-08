import { PrismaClient } from '@prisma/client';

export async function seedErp(prisma: PrismaClient) {
  console.log('Seeding ERP Data...');

  const margherita = await prisma.menuItem.findUnique({ where: { slug: 'margherita-pizza' } });

  if (margherita) {
    await prisma.erpRecipeMapping.upsert({
      where: { menuItemId: margherita.id },
      update: {},
      create: {
        menuItemId: margherita.id,
        recipeId: 'REC-001',
        menuItemName: margherita.name,
        menuItemPrice: margherita.price,
        recipeName: '瑪格麗特麵團與配料',
        tenantId: 'demo-tenant-id',
      },
    });
  }
}
