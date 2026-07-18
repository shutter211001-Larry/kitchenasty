const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing findMany on orders...');
  const orders = await prisma.order.findMany({ take: 1 });
  console.log('Success!', orders.length, 'orders found.');
  if (orders.length > 0) {
    console.log('invoiceType:', orders[0].invoiceType);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
