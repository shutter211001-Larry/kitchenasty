/*
  Warnings:

  - A unique constraint covering the columns `[lineUserId]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[lineUserId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "cookie_consents" DROP CONSTRAINT "cookie_consents_customerId_fkey";

-- DropForeignKey
ALTER TABLE "loyalty_transactions" DROP CONSTRAINT "loyalty_transactions_customerId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_customerId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_customerId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_customerId_fkey";

-- AlterTable
ALTER TABLE "allergens" ADD COLUMN     "nameTranslations" JSONB;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "descriptionTranslations" JSONB,
ADD COLUMN     "nameTranslations" JSONB;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "lineDisplayName" TEXT,
ADD COLUMN     "lineUserId" TEXT;

-- AlterTable
ALTER TABLE "mealtimes" ADD COLUMN     "nameTranslations" JSONB;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "descriptionTranslations" JSONB,
ADD COLUMN     "nameTranslations" JSONB,
ADD COLUMN     "unit" TEXT DEFAULT '份',
ADD COLUMN     "unitTranslations" JSONB;

-- AlterTable
ALTER TABLE "menu_option_values" ADD COLUMN     "nameTranslations" JSONB;

-- AlterTable
ALTER TABLE "menu_options" ADD COLUMN     "nameTranslations" JSONB;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "distance" DOUBLE PRECISION,
ADD COLUMN     "isRemote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickupNumber" VARCHAR(10),
ADD COLUMN     "userLat" DOUBLE PRECISION,
ADD COLUMN     "userLon" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "lineSettings" JSONB,
ADD COLUMN     "menuSection" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lineDisplayName" TEXT,
ADD COLUMN     "lineUserId" TEXT;

-- CreateTable
CREATE TABLE "dietary_preferences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTranslations" JSONB,

    CONSTRAINT "dietary_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_dietary_preferences" (
    "menuItemId" TEXT NOT NULL,
    "dietaryPreferenceId" TEXT NOT NULL,

    CONSTRAINT "menu_item_dietary_preferences_pkey" PRIMARY KEY ("menuItemId","dietaryPreferenceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "dietary_preferences_name_key" ON "dietary_preferences"("name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_lineUserId_key" ON "customers"("lineUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_lineUserId_key" ON "users"("lineUserId");

-- AddForeignKey
ALTER TABLE "menu_item_dietary_preferences" ADD CONSTRAINT "menu_item_dietary_preferences_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_dietary_preferences" ADD CONSTRAINT "menu_item_dietary_preferences_dietaryPreferenceId_fkey" FOREIGN KEY ("dietaryPreferenceId") REFERENCES "dietary_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cookie_consents" ADD CONSTRAINT "cookie_consents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
