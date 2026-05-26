import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('Starting migration: safetyStock = 0 -> NULL...');
  
  const countBefore = await prisma.ingredient.count({
    where: {
      safetyStock: 0
    }
  });
  console.log(`Found ${countBefore} ingredients with safetyStock = 0.`);

  const result = await prisma.ingredient.updateMany({
    where: {
      safetyStock: 0
    },
    data: {
      safetyStock: null
    }
  });

  console.log(`Successfully updated ${result.count} ingredients with safetyStock = 0 to NULL.`);

  const countAfter = await prisma.ingredient.count({
    where: {
      safetyStock: null
    }
  });
  console.log(`Total ingredients with safetyStock = NULL: ${countAfter}`);
}

main()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
