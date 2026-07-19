const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:HMaOsUWDPanoTomfBnxznTGPcGChXRzn@tokaido.proxy.rlwy.net:20780/railway"
    }
  }
});

async function test() {
  const orderIds = [
    "SH-MRPQGVD3-RH8",
    "SH-MRPY2PEO-D92",
    "SH-MRPY42FL-MSS",
    "SH-MRQ8NCF1-OQF",
    "SH-MRQFECZJ-KRW"
  ];

  const orders = await prisma.order.findMany({
    where: {
      orderNumber: { in: orderIds }
    },
    select: {
      orderNumber: true,
      deletedAt: true
    }
  });

  console.log("Check deletedAt for these orders:");
  orders.forEach(o => {
    console.log(`${o.orderNumber} | deletedAt: ${o.deletedAt}`);
  });
}

test().catch(console.error).finally(() => prisma.$disconnect());
