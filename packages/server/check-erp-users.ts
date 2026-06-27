import { PrismaClient } from '@shutter-erp/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:EgUCDEJmaPimGQGOZXPpnFWdBACqqMcS@reseau.proxy.rlwy.net:19511/railway'
    }
  }
});

async function main() {
  const users = await prisma.user.findMany();
  console.log('ERP Users in second DB:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
