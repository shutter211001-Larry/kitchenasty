import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const events = await prisma.analyticsEvent.count();
  console.log('Analytics events count:', events);
  
  const eventsGroups = await prisma.analyticsEvent.groupBy({
    by: ['eventType'],
    _count: true
  });
  console.log('Events by type:', eventsGroups);

  const orders = await prisma.order.count();
  console.log('Orders count:', orders);
}
main().finally(() => prisma.$disconnect());
