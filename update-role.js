const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.user.update({
    where: { email: 'test@test.com' },
    data: { role: 'SUPER_ADMIN' }
  });
  console.log('Role updated successfully.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
