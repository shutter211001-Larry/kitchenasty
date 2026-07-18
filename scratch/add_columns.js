const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Executing ALTER TABLE directly...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoiceType" VARCHAR(50);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoiceCarrier" VARCHAR(255);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "taxId" VARCHAR(50);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "companyTitle" VARCHAR(255);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "donationCode" VARCHAR(50);`);
  console.log('ALTER TABLE complete.');

  const result = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'`;
  console.log('Columns now:', result.map(r => r.column_name).filter(c => ['invoiceType', 'taxId'].includes(c)));
}

main().catch(console.error).finally(() => prisma.$disconnect());
