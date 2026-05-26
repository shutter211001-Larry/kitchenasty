import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('=== Starting Optimized Allergen Tag Batch Migration ===');

  const allergenNames = [
    '魚類',
    '甲殼類',
    '含麩質之穀物',
    '蛋類',
    '乳製品',
    '堅果類',
    '芝麻',
    '大豆',
    '花生',
    '芒果'
  ];

  console.log('Creating or verifying allergen tags in DB...');
  const allergenMap: Record<string, string> = {};
  for (const name of allergenNames) {
    const record = await prisma.allergen.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    allergenMap[name] = record.id;
  }

  console.log('Fetching ingredients with allergen data...');
  const ingredients = await prisma.ingredient.findMany({
    where: {
      OR: [
        { isAllergen: true },
        { NOT: { allergenType: null } }
      ]
    },
    select: {
      id: true,
      name: true,
      allergenType: true
    }
  });

  console.log(`Found ${ingredients.length} ingredients to process.`);

  // Filter out ingredients that do not need conversion (empty or invalid allergenType)
  const itemsToUpdate = ingredients.filter(ing => {
    if (!ing.allergenType) return false;
    const parts = ing.allergenType.split(/[,，/、\s]+/).map(p => p.trim()).filter(Boolean);
    const hasValidTag = parts.some(p => allergenMap[p]);
    return hasValidTag;
  });

  console.log(`Actual ingredients needing update: ${itemsToUpdate.length}`);

  // Process in chunks of 50 in parallel to prevent connection exhaust but maximize speed
  const CHUNK_SIZE = 50;
  let processedCount = 0;

  for (let i = 0; i < itemsToUpdate.length; i += CHUNK_SIZE) {
    const chunk = itemsToUpdate.slice(i, i + CHUNK_SIZE);
    
    // Build update promises
    const promises = chunk.map(ing => {
      const parts = ing.allergenType!
        .split(/[,，/、\s]+/)
        .map(p => p.trim())
        .filter(Boolean);

      const idsToConnect = parts
        .map(p => allergenMap[p])
        .filter(Boolean);

      return prisma.ingredient.update({
        where: { id: ing.id },
        data: {
          allergens: {
            connect: idsToConnect.map(id => ({ id }))
          }
        }
      });
    });

    // Execute chunk
    await Promise.all(promises);
    processedCount += chunk.length;
    console.log(`Successfully migrated ${processedCount} / ${itemsToUpdate.length} ingredients...`);
  }

  console.log(`=== Allergen Tag Batch Migration Done Successfully! Processed ${processedCount} ingredients in parallel. ===`);
}

main()
  .catch(err => {
    console.error('Allergen migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
