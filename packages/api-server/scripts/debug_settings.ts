import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allSettings = await prisma.siteSettings.findMany({
    select: {
      id: true,
      tenantId: true,
      mailSettings: true
    }
  });

  console.log('Total SiteSettings found:', allSettings.length);
  for (const s of allSettings) {
    const hasMail = s.mailSettings ? 'YES' : 'NO';
    console.log(`- ID: ${s.id}, TenantID: ${s.tenantId}, HasMail: ${hasMail}`);
  }
}

main().finally(() => prisma.$disconnect());
