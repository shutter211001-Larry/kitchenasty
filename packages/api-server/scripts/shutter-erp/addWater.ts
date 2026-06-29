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

async function main() {
  console.log('Checking database for ingredient "水"...');
  const existing = await prisma.ingredient.findFirst({
    where: { name: '水' }
  });
  
  if (existing) {
    console.log('水 already exists in the database:', existing);
    return;
  }
  
  console.log('Creating ingredient "水"...');
  const created = await prisma.ingredient.create({
    data: {
      name: '水',
      category: '其他',
      unit: 'g',
      calories: 0,
      protein: 0,
      fat: 0,
      carbohydrates: 0,
      sodium: 0,
      isAllergen: false
    }
  });
  console.log('Successfully created 水 ingredient:', created);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
