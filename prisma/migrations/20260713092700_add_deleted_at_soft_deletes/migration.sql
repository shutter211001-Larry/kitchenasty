-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- AlterTable categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- AlterTable menu_items
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- AlterTable orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;
