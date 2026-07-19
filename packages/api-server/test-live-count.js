const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:HMaOsUWDPanoTomfBnxznTGPcGChXRzn@tokaido.proxy.rlwy.net:20780/railway"
    }
  }
});
async function test() {
  const count = await prisma.menuItem.count({
    where: { tenantId: "f1b2e97c-f53c-473e-8528-26dd9ffb37e0", deletedAt: null }
  });
  console.log("Total items in true live DB:", count);
}
test().catch(console.error).finally(() => prisma.$disconnect());
