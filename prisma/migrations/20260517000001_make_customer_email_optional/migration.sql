-- Clean up existing fake LINE emails by setting them to NULL
UPDATE "customers" SET "email" = NULL WHERE "email" LIKE '%@line.pizzastudio.com';

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;
