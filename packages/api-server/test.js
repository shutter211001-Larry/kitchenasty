const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const id = 'SH-MQXCQPHG-XT0';
  const whereClause = id.startsWith('SH-') || id.length < 20 ? { orderNumber: id } : { id };
  const order = await prisma.order.findUnique({
    where: whereClause,
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      location: { select: { id: true, name: true } },
      table: { select: { id: true, name: true } },
      payments: true,
      items: {
        include: {
          menuItem: { select: { id: true, name: true, nameTranslations: true, slug: true } },
          options: {
            include: {
              menuOptionValue: { select: { id: true, nameTranslations: true } }
            }
          }
        }
      }
    }
  });
  console.log(order ? 'FOUND' : 'NOT FOUND');
}
test().finally(() => prisma.$disconnect());
