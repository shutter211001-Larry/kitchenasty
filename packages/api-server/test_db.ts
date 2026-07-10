import prisma from './src/lib/db.js';
import { tenantStorage } from './src/middleware/tenantStorage.js';

async function main() {
  await tenantStorage.run({ tenantId: null }, async () => {
    const tenants = await (prisma as any).tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true, locations: true, orders: true }
        },
        users: {
          where: { role: 'SUPER_ADMIN' },
          take: 1,
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });
    console.log(JSON.stringify(tenants, null, 2));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
