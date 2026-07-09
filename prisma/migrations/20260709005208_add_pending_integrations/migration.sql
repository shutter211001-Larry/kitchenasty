-- DropIndex (Use IF EXISTS equivalent or ignore via error catching)
DO $$ BEGIN DROP INDEX IF EXISTS "_UserJobRoles_B_index"; EXCEPTION WHEN undefined_object THEN null; END $$;

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "pendingIntegrations" JSONB;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "pendingIntegrationsToken" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_UserJobRoles_B_index" ON "_UserJobRoles"("B");
