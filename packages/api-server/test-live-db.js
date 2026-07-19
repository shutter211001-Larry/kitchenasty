const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:HMaOsUWDPanoTomfBnxznTGPcGChXRzn@tokaido.proxy.rlwy.net:20780/railway"
    }
  }
});
async function test() {
  console.log("Checking live database...");
  const item = await prisma.menuItem.findFirst({
    where: { slug: "chilibeefpizza" },
    include: { category: true }
  });
  if (item) {
    console.log("Found item:");
    console.log(`ID: ${item.id}`);
    console.log(`Name: ${item.name}`);
    console.log(`isActive: ${item.isActive}`);
    console.log(`stockQty: ${item.stockQty}`);
    console.log(`TenantID: ${item.tenantId}`);
    console.log(`Category: ${item.category ? item.category.name : 'null'} (isActive: ${item.category?.isActive})`);
  } else {
    console.log("Item chilibeefpizza not found in this database!");
  }
}
test().catch(console.error).finally(() => prisma.$disconnect());
