import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Please provide a DATABASE_URL environment variable.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ACTION_GROUPS = [
  { name: '準備', icon: 'PackageOpen', actions: ['稱重', '切片', '切塊', '剝皮'] },
  { name: '處理', icon: 'LayoutList', actions: ['攪拌', '混合', '揉捏', '發酵', '靜置', '冷藏'] },
  { name: '烹飪', icon: 'Flame', actions: ['烤', '煎', '煮', '炸', '加熱', '溫度'] },
  { name: '裝盤', icon: 'UtensilsCrossed', actions: ['倒入', '擺盤', '裝飾'] },
];

const UNIT_GROUPS = [
  { name: '重量', units: ['g', 'kg'] },
  { name: '時間', units: ['min', 'hr'] },
  { name: '長度', units: ['cm', 'mm'] },
  { name: '溫度', units: ['℃', '℉'] },
  { name: '數量', units: ['顆', '個', '片', '份'] },
  { name: '容積', units: ['ml', 'L'] },
];

async function main() {
  console.log('Seeding dictionaries...');

  for (const group of ACTION_GROUPS) {
    const createdGroup = await prisma.actionGroup.upsert({
      where: { name: group.name },
      update: { icon: group.icon },
      create: { name: group.name, icon: group.icon },
    });

    for (const actionName of group.actions) {
      await prisma.action.create({
        data: {
          name: actionName,
          groupId: createdGroup.id
        }
      }).catch(() => { /* ignore if exists in real logic, but here we just catch unique issues if any. Wait, action name isn't unique, so let's just create if not found by name and group */ });
      
      // better way using firstOrCreate approach:
      const existingAction = await prisma.action.findFirst({
        where: { name: actionName, groupId: createdGroup.id }
      });
      if (!existingAction) {
        await prisma.action.create({
          data: { name: actionName, groupId: createdGroup.id }
        });
      }
    }
  }

  for (const group of UNIT_GROUPS) {
    const createdGroup = await prisma.unitGroup.upsert({
      where: { name: group.name },
      update: {},
      create: { name: group.name },
    });

    for (const unitName of group.units) {
      const existingUnit = await prisma.unit.findFirst({
        where: { name: unitName, groupId: createdGroup.id }
      });
      if (!existingUnit) {
        await prisma.unit.create({
          data: { name: unitName, groupId: createdGroup.id }
        });
      }
    }
  }

  console.log('Dictionaries seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
