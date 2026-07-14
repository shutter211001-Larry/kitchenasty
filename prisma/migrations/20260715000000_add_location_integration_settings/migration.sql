-- AlterTable
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "integrationSettings" JSONB;
