const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:HMaOsUWDPanoTomfBnxznTGPcGChXRzn@tokaido.proxy.rlwy.net:20780/railway"
    }
  }
});

async function test() {
  const startDate = new Date('2026-07-16T16:00:00.000Z'); // 7/17 00:00 TPE
  const endDate = new Date('2026-07-19T16:00:00.000Z'); // 7/20 00:00 TPE
  
  const tenantId = "f1b2e97c-f53c-473e-8528-26dd9ffb37e0";

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: { gte: startDate, lt: endDate }
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  let dashboardSum = 0;
  let paidSum = 0;
  
  console.log("Orders 7/17 ~ 7/19:");
  orders.forEach(o => {
    const tpeDate = new Date(o.createdAt.getTime() + 8*60*60*1000).toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${tpeDate}] ${o.orderNumber} | Status: ${o.status.padEnd(10)} | Pay: ${o.paymentStatus.padEnd(10)} | Total: ${o.total}`);
    
    if (o.status !== 'CANCELLED') {
      dashboardSum += Number(o.total);
    }
    if (o.paymentStatus === 'PAID') {
      paidSum += Number(o.total);
    }
  });

  console.log("-----------------------------------------");
  console.log("Dashboard Calculation (status != CANCELLED):", dashboardSum);
  console.log("Actual Paid Calculation (paymentStatus = PAID):", paidSum);
}

test().catch(console.error).finally(() => prisma.$disconnect());
