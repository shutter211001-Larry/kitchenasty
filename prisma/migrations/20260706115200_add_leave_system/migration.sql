DO $$ BEGIN
    DO $ BEGIN
    CREATE TYPE "LeaveType" AS ENUM ('PERSONAL', 'SICK', 'ANNUAL', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DO $ BEGIN
    CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "hourlyNationalHolidayMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "monthlyNationalHolidayOvertime" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "leave_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "leave_requests" DROP CONSTRAINT IF EXISTS "leave_requests_userId_fkey";
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_userId_fkey') THEN
        ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $;

ALTER TABLE "leave_requests" DROP CONSTRAINT IF EXISTS "leave_requests_managerId_fkey";
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_managerId_fkey') THEN
        ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $;
