import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.analyticsEvent.groupBy({
    by: ['eventType'],
    _count: {
      _all: true
    }
  });
  console.log("All Events in DB:");
  console.table(events);
}

main().catch(console.error).finally(() => prisma.$disconnect());
