import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMailSettings() {
  // 1. Find the leaked settings
  const wrongTenantSettings = await prisma.siteSettings.findUnique({
    where: { id: '5ada0d08-bd54-412b-9808-d275be55931f' }
  });

  if (wrongTenantSettings && wrongTenantSettings.mailSettings) {
    console.log('Found leaked mailSettings on tenant:', wrongTenantSettings.tenantId);
    
    // 2. Apply it to the global default settings
    await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: { mailSettings: wrongTenantSettings.mailSettings },
      create: { 
        id: 'default', 
        tenantId: null,
        mailSettings: wrongTenantSettings.mailSettings 
      }
    });
    console.log('Successfully copied mailSettings to global default settings.');

    // 3. Clear from the wrong tenant
    await prisma.siteSettings.update({
      where: { id: wrongTenantSettings.id },
      data: { mailSettings: null }
    });
    console.log('Cleared mailSettings from the wrong tenant.');
  } else {
    console.log('No leaked mailSettings found on that specific tenant.');
  }
}

fixMailSettings().finally(() => prisma.$disconnect());
