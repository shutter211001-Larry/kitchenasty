const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function test() {
  const cats = await prisma.category.findMany({
    where: { tenantId: "648a3e0a-93a7-4219-a667-33d38b4844e0", deletedAt: null }
  });
  console.log(JSON.stringify(cats.map(c => ({ name: c.name, isActive: c.isActive })), null, 2));
}
test().catch(console.error).finally(() => prisma.$disconnect());
