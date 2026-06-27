-- AlterEnum
ALTER TYPE "CouponType" ADD VALUE 'BOGO';

-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'FROZEN_DELIVERY';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "isFrozenDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sharedStockQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sharedStockThreshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "trackSharedStock" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '自訂折扣活動',
ALTER COLUMN "code" DROP NOT NULL;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "isRewardItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rewardPointsPrice" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "menu_option_values" ADD COLUMN     "stockQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trackStock" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "tableId" TEXT;

-- CreateTable
CREATE TABLE "group_order_sessions" (
    "id" TEXT NOT NULL,
    "pin" VARCHAR(4) NOT NULL,
    "locationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cartItems" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_order_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erp_recipe_mappings" (
    "menuItemId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "menuItemName" TEXT NOT NULL DEFAULT '',
    "menuItemPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recipeName" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "erp_recipe_mappings_pkey" PRIMARY KEY ("menuItemId")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "locationId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_order_sessions_locationId_idx" ON "group_order_sessions"("locationId");

-- CreateIndex
CREATE INDEX "group_order_sessions_tableId_idx" ON "group_order_sessions"("tableId");

-- CreateIndex
CREATE INDEX "group_order_sessions_pin_idx" ON "group_order_sessions"("pin");

-- CreateIndex
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_menuItemId_idx" ON "order_items"("menuItemId");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_locationId_idx" ON "orders"("locationId");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group_order_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_order_sessions" ADD CONSTRAINT "group_order_sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_order_sessions" ADD CONSTRAINT "group_order_sessions_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
