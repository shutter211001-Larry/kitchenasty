require('dotenv').config({ path: 'packages/api-server/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres' } } });
async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "staff_password_reset_tokens" (
      "id" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "staff_password_reset_tokens_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "staff_password_reset_tokens_token_key" ON "staff_password_reset_tokens"("token");
  `);
  console.log('Created staff_password_reset_tokens table.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
