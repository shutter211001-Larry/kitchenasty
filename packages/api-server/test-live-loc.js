const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:HMaOsUWDPanoTomfBnxznTGPcGChXRzn@tokaido.proxy.rlwy.net:20780/railway"
    }
  }
});
async function test() {
  const item = await prisma.menuItem.findFirst({
    where: { slug: "chilibeefpizza" },
    include: { locationOverrides: true }
  });
  console.log("locationId:", item.locationId);
  console.log("locationOverrides:", item.locationOverrides);
}
test().catch(console.error).finally(() => prisma.$disconnect());
