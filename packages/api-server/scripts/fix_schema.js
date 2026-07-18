const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- RUNNING EMERGENCY SCHEMA FIX ---');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoiceType" VARCHAR(50);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoiceCarrier" VARCHAR(255);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "taxId" VARCHAR(50);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "companyTitle" VARCHAR(255);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "donationCode" VARCHAR(50);`);
    
    await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'TRANSLATING', 'COMPLETED', 'FAILED', 'TRANSLATED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "translationStatus" "TranslationStatus" DEFAULT 'PENDING';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "translationStatus" "TranslationStatus" DEFAULT 'PENDING';`);

    console.log('--- EMERGENCY SCHEMA FIX COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('--- EMERGENCY SCHEMA FIX FAILED ---', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
