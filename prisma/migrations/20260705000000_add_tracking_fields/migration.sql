-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "logisticsProvider" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "frozenDeliveryMethod" TEXT;
