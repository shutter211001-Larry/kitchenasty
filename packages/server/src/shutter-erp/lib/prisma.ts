import 'dotenv/config';
import { PrismaClient } from '@shutter-erp/client';

const rawConnectionString = process.env.SHUTTER_ERP_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/dummy';
const connectionString = `${rawConnectionString}?connection_limit=20&pool_timeout=10&statement_cache_size=0`;

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
