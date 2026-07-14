-- Add isFranchise and franchiseeName to Location
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "isFranchise" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "franchiseeName" TEXT;

-- Add isSupport to staff_attendance
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "isSupport" BOOLEAN NOT NULL DEFAULT false;
