-- Add customer moderation flags and social-login fields that exist in the
-- Prisma schema but were missing from earlier migrations.
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "isWhitelisted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "isBlacklisted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "facebookId" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "googleEmail" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "customers_facebookId_key" ON "customers"("facebookId");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_googleId_key" ON "customers"("googleId");

-- Used to prevent duplicate registration bonuses across account recreation.
CREATE TABLE IF NOT EXISTS "registration_bonus_records" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_bonus_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "registration_bonus_records_provider_identifier_key"
    ON "registration_bonus_records"("provider", "identifier");

-- Used by the order security middleware.
CREATE TABLE IF NOT EXISTS "ip_blacklist" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ip_blacklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ip_blacklist_ip_key" ON "ip_blacklist"("ip");
