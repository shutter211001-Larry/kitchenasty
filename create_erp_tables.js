require('dotenv').config({ path: 'packages/api-server/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres' } } });

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InviteToken" (
      "id" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "role" "Role" NOT NULL DEFAULT 'STAFF',
      "invitedBy" TEXT NOT NULL,
      "usedAt" TIMESTAMP(3),
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "InviteToken_token_key" ON "InviteToken"("token");
  `);
  
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
      "id" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
  `);
  
  console.log('Tables created successfully');
}

main().catch(console.error).finally(() => prisma.$disconnect());
