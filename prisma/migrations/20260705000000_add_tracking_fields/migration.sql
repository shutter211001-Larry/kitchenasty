-- AlterTable
ALTER TABLE "orders" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN "logisticsProvider" TEXT;
ALTER TABLE "orders" ADD COLUMN "frozenDeliveryMethod" TEXT;
