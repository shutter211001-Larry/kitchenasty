const { PrismaClient } = require('@prisma/client');

// Connect to the default db to list databases
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:JxwkKyoRQEwowOPtjzBwkdkwSUtVRHfL@hayabusa.proxy.rlwy.net:46252/postgres"
    }
  }
});

async function main() {
  const dbs = await prisma.$queryRaw`SELECT datname FROM pg_database WHERE datistemplate = false;`;
  console.log('Databases on hayabusa:', dbs.map(d => d.datname));
}

main().catch(console.error).finally(() => prisma.$disconnect());
