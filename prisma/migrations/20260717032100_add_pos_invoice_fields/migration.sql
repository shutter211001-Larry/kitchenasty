-- CreateEnum (Idempotent)
DO $$ BEGIN
 CREATE TYPE "OrderSource" AS ENUM ('POS', 'STOREFRONT', 'DELIVERY_PLATFORM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'ISSUED', 'FAILED', 'VOIDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AlterEnum
-- By omitting IF NOT EXISTS, Prisma detects this and safely disables the transaction block.
ALTER TYPE "OrderType" ADD VALUE 'DINE_IN';

-- AlterTable (Idempotent)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "source" "OrderSource" DEFAULT 'STOREFRONT';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoiceStatus" "InvoiceStatus";
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "carrierType" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "carrierNum" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "externalOrderId" TEXT;
