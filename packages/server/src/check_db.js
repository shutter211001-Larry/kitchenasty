import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- Checking database columns for "customers" table ---');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers';
    `;
    console.log(JSON.stringify(columns, null, 2));
    
    console.log('\n--- Attempting a direct findFirst ---');
    const customer = await prisma.customer.findFirst();
    console.log('Success findFirst:', !!customer);
  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
