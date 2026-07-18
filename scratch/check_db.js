const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`SELECT current_database(), current_schema()`;
  console.log('Current DB and Schema:', result);
  
  const tables = await prisma.$queryRaw`SELECT table_catalog, table_schema, table_name FROM information_schema.tables WHERE table_name = 'orders'`;
  console.log('Orders tables:', tables);
}

main().catch(console.error).finally(() => prisma.$disconnect());
