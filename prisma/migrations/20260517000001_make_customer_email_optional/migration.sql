-- AlterTable: First drop the NOT NULL constraint
ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;

-- Then clean up existing fake LINE emails by setting them to NULL
UPDATE "customers" SET "email" = NULL WHERE "email" LIKE '%@line.pizzastudio.com';
