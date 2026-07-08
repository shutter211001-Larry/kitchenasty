import { PrismaClient, Prisma } from '@prisma/client';
import { tenantStorage } from '../middleware/tenantStorage.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 1. Initialize the Base Prisma Client
const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// 2. Define models that belong to a tenant
// This list must be kept in sync with schema.prisma models that have tenantId
const tenantAwareModels = [
  'User',
  'Customer',
  'Location',
  'Category',
  'MenuItem',
  'Order',
  'Coupon',
  'SiteSettings',
  'Table', 'Reservation', 'Review', 'LoyaltyTransaction', 'GroupOrderSession',
  'CustomerGroup', 'StaffPasswordResetToken', 'LegalPage', 'CookieCategory',
  'RegistrationBonusRecord', 'CookieConsent', 'InviteToken', 'AutomationRule',
  'AuditLog', 'ErpRecipeMapping', 'ChatMessage', 'StaffAttendance',
  'AttendanceCorrectionRequest', 'LeaveRequest', 'JobRole', 'UserAvailability',
  'StaffTimeOff', 'ShiftRequirement', 'WeeklyShiftRequirement', 'Shift',
  'PayrollPeriod', 'Payslip', 'PayslipItem', 'InsuranceProfile', 'EmploymentRecord',
  'LeaveBalance', 'AttendanceAnomaly', 'EmployeeDocument'
];

// 3. Extend Prisma Client to automatically inject tenantId (Row-Level Security concept)
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const store = tenantStorage.getStore();
        const tenantId = store?.tenantId;

        // Only inject if there's an active tenantId and the model is tenant-aware
        if (tenantId && tenantAwareModels.includes(model)) {
          
          // Inject for queries (find, update, delete, count, etc)
          if (
            operation === 'findUnique' ||
            operation === 'findUniqueOrThrow' ||
            operation === 'findFirst' ||
            operation === 'findFirstOrThrow' ||
            operation === 'findMany' ||
            operation === 'update' ||
            operation === 'updateMany' ||
            operation === 'delete' ||
            operation === 'deleteMany' ||
            operation === 'count' ||
            operation === 'aggregate' ||
            operation === 'groupBy'
          ) {
            (args as any).where = { ...(args as any).where, tenantId };
          }

          // Inject for creation
          if (operation === 'create') {
            (args as any).data = { ...(args as any).data, tenantId };
          }
          if (operation === 'createMany') {
            if (Array.isArray((args as any).data)) {
              (args as any).data = (args as any).data.map((d: any) => ({ ...d, tenantId }));
            } else {
              (args as any).data = { ...(args as any).data, tenantId };
            }
          }
          if (operation === 'upsert') {
            (args as any).where = { ...(args as any).where, tenantId };
            (args as any).create = { ...(args as any).create, tenantId };
          }
        }
        
        return query(args);
      },
    },
  },
}) as unknown as PrismaClient; // Cast back to PrismaClient to avoid rewriting thousands of types across the app

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma as any;
}

export default prisma;
