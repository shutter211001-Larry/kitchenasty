const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Executing ALTER TABLE for translationStatus...');
  // Need to make sure the enum exists first
  await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'TRANSLATING', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
  
  await prisma.$executeRawUnsafe(`ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "translationStatus" "TranslationStatus" DEFAULT 'PENDING';`);
  console.log('ALTER TABLE complete.');

  const result = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'menu_items'`;
  console.log('Columns now:', result.map(r => r.column_name).filter(c => c === 'translationStatus'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
