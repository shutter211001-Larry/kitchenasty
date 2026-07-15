import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, domain: true }
  });
  console.log("Tenants:");
  console.table(tenants);
}

main().catch(console.error).finally(() => prisma.$disconnect());
