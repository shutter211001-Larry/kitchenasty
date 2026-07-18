import { PrismaClient } from '@prisma/client';
import { startOfDay, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

async function main() {
  const timezone = 'Asia/Taipei';
  const now = new Date();
  const localNow = toZonedTime(now, timezone);
  const todayStart = startOfDay(localNow);
  const weekStart = subDays(todayStart, 7);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: weekStart },
      status: { not: 'CANCELLED' }
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(orders);
}

main().catch(console.error).finally(() => prisma.$disconnect());
