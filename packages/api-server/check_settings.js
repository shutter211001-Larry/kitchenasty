const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.siteSettings.findUnique({where:{id:'default'}}).then(s => {
  console.log('generalSettings:', s.generalSettings);
}).finally(() => prisma.$disconnect());
