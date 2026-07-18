const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:JxwkKyoRQEwowOPtjzBwkdkwSUtVRHfL@hayabusa.proxy.rlwy.net:46252/railway"
    }
  }
});

async function main() {
  console.log('Executing ALTER TABLE directly on RAILWAY database...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoiceType" VARCHAR(50);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoiceCarrier" VARCHAR(255);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "taxId" VARCHAR(50);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "companyTitle" VARCHAR(255);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "donationCode" VARCHAR(50);`);
  
  // Also add translationStatus just in case the Railway database doesn't have it either!
  await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'TRANSLATING', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "translationStatus" "TranslationStatus" DEFAULT 'PENDING';`);
  
  console.log('ALTER TABLE complete on RAILWAY database.');

  const result = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'`;
  console.log('Orders Columns now:', result.map(r => r.column_name).filter(c => ['invoiceType', 'taxId'].includes(c)));
}

main().catch(console.error).finally(() => prisma.$disconnect());
