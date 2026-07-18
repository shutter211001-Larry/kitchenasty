const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:EuiMDHVuFTjWxXOKQIwgIqmkLxVbkrOu@zephyr.proxy.rlwy.net:17127/railway"
    }
  }
});

async function main() {
  const result = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'`;
  console.log('Columns in zephyr db:', result.map(r => r.column_name).filter(c => ['invoiceType', 'taxId'].includes(c)));
}

main().catch(console.error).finally(() => prisma.$disconnect());
