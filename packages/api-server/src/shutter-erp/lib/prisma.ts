import 'dotenv/config';
import { PrismaClient } from '@shutter-erp/client';

const connectionString = process.env.SHUTTER_ERP_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/dummy';

const globalForPrisma = globalThis as unknown as {
  shutterErpPrisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.shutterErpPrisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.shutterErpPrisma = prisma;
}

export default prisma;
