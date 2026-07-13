-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- AlterTable categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- AlterTable menu_items
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;
