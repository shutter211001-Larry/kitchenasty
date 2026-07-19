import cron from 'node-cron';
import prisma from '../lib/db.js';
import logger from '../lib/logger.js';

// Run every day at 03:00 AM
export const startTenantCleanupCron = () => {
  cron.schedule('0 3 * * *', async () => {
    logger.info('Starting tenant cleanup cron job...');
    try {
      const now = new Date();

      // Find tenants scheduled for deletion that have passed their deletion time
      const tenantsToDelete = await prisma.tenant.findMany({
        where: {
          scheduledDeletionAt: {
            lte: now
          }
        },
        select: { id: true, name: true }
      });

      if (tenantsToDelete.length === 0) {
        logger.info('No tenants scheduled for deletion today.');
        return;
      }

      logger.info(`Found ${tenantsToDelete.length} tenants to permanently delete.`);

      for (const tenant of tenantsToDelete) {
        const { id } = tenant;
        logger.info(`Permanently deleting tenant ${tenant.name} (${id})...`);
        try {
          // Manually delete blocking records to prevent Foreign Key Constraint errors
          // We use raw SQL to bypass the Prisma Soft Delete extension.
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "orders" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "reservations" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "reviews" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "loyalty_transactions" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "chat_messages" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "shifts" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "attendance_correction_requests" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "leave_requests" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "staff_attendance" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "group_order_sessions" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "tables" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "staff_password_reset_tokens" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "users" WHERE "tenantId" = $1`, id);
          await (prisma as any).$executeRawUnsafe(`DELETE FROM "categories" WHERE "tenantId" = $1`, id);
          
          await (prisma as any).tenant.delete({ where: { id } });
          
          logger.info(`Successfully permanently deleted tenant ${tenant.name} (${id}).`);
        } catch (error) {
          logger.error({ err: error, tenantId: id }, `Failed to permanently delete tenant ${id}`);
        }
      }

    } catch (error) {
      logger.error({ err: error }, 'Tenant cleanup cron job failed');
    }
  });
};
