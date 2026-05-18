-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'zh-TW';
