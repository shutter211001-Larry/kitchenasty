require('dotenv').config({ path: 'packages/api-server/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres' } } });

async function main() {
  const tables = await prisma.$queryRawUnsafe(`SELECT tablename FROM pg_tables WHERE schemaname='public';`);
  console.log(tables.map(t => t.tablename).join(', '));
}

main().catch(console.error).finally(() => prisma.$disconnect());
