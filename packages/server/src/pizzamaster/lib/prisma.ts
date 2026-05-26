import 'dotenv/config';
import { PrismaClient } from '../../generated/pizzamaster-client/index.js';

const connectionString = process.env.PIZZAMASTER_DATABASE_URL || process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  pizzamasterPrisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.pizzamasterPrisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pizzamasterPrisma = prisma;
}

export default prisma;
