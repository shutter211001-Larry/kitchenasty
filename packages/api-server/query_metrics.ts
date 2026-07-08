import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const metrics = await prisma.apiMetric.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log(JSON.stringify(metrics, null, 2));
}
main().finally(() => prisma.$disconnect());
