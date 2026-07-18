import { PrismaClient } from '@prisma/client';
import { startOfDay, startOfMonth, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

async function main() {
  const timezone = 'Asia/Taipei';
  const now = new Date();
  const localNow = toZonedTime(now, timezone);
  const todayStart = startOfDay(localNow);
  const weekStart = subDays(todayStart, 7);
  const monthStart = startOfMonth(localNow);

  const [orderMetrics] = await prisma.$queryRaw<any[]>`
    SELECT
      COUNT(CASE WHEN "createdAt" >= ${todayStart} THEN 1 END)::bigint AS "ordersToday",
      COALESCE(SUM(CASE WHEN "createdAt" >= ${todayStart} AND status != 'CANCELLED' THEN total ELSE 0 END), 0)::double precision AS "revenueToday",
      COUNT(CASE WHEN "createdAt" >= ${weekStart} THEN 1 END)::bigint AS "ordersThisWeek",
      COALESCE(SUM(CASE WHEN "createdAt" >= ${weekStart} AND status != 'CANCELLED' THEN total ELSE 0 END), 0)::double precision AS "revenueThisWeek",
      COUNT(CASE WHEN "createdAt" >= ${monthStart} THEN 1 END)::bigint AS "ordersThisMonth",
      COALESCE(SUM(CASE WHEN "createdAt" >= ${monthStart} AND status != 'CANCELLED' THEN total ELSE 0 END), 0)::double precision AS "revenueThisMonth",
      COUNT(*)::bigint AS "totalOrders",
      COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total ELSE 0 END), 0)::double precision AS "totalRevenue"
    FROM "orders"
  `;

  console.log(orderMetrics);
}

main().catch(console.error).finally(() => prisma.$disconnect());
