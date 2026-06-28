const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 1 }).then(orders => {
  console.log('Order:', orders[0]);
}).finally(() => prisma.$disconnect());
