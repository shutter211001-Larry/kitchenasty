import { PrismaClient } from '@prisma/client';
import { seedSystem } from './seeds/01_system';
import { seedUsers } from './seeds/02_users';
import { seedLocations } from './seeds/03_locations';
import { seedMenu } from './seeds/04_menu';
import { seedErp } from './seeds/05_erp';
import { seedStaff } from './seeds/06_staff';
import { seedOrders } from './seeds/07_orders';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    await seedSystem(prisma);
    await seedUsers(prisma);
    await seedLocations(prisma);
    await seedMenu(prisma);
    await seedErp(prisma);
    await seedStaff(prisma);
    await seedOrders(prisma);

    console.log('\n✅ Seed completed successfully!');
    console.log('--------------------------------------------------');
    console.log('🔑 平台管理員: (依據環境變數 ADMIN_EMAIL / ADMIN_PASSWORD)');
    console.log('🔑 示範店長帳號: demo@shutter.com / admin123');
    console.log('🔑 員工帳號: staff@shutter.com / admin123');
    console.log('🔑 客戶帳號: customer@example.com / customer123');
    console.log('--------------------------------------------------');
  } catch (e) {
    console.error('\n❌ Error during seeding:');
    console.error(e);
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
