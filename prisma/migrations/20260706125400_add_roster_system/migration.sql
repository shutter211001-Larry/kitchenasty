-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DayType" AS ENUM ('WORKDAY', 'REST_DAY', 'REGULAR_OFF', 'NATIONAL_HOLIDAY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "locations" 
ADD COLUMN IF NOT EXISTS "enableOvertimePay" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "overtimeMultiplier1" DOUBLE PRECISION NOT NULL DEFAULT 1.34,
ADD COLUMN IF NOT EXISTS "overtimeMultiplier2" DOUBLE PRECISION NOT NULL DEFAULT 1.67,
ADD COLUMN IF NOT EXISTS "regularDayMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS "restDayMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.34;

-- CreateTable
CREATE TABLE IF NOT EXISTS "job_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_availabilities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "user_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_requirements" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "shift_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shifts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "jobRoleId" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "dayType" "DayType" NOT NULL DEFAULT 'WORKDAY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_UserJobRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "_UserJobRoles_AB_unique" ON "_UserJobRoles"("A", "B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_UserJobRoles_B_index" ON "_UserJobRoles"("B");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_roles_locationId_fkey') THEN
        ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_availabilities_userId_fkey') THEN
        ALTER TABLE "user_availabilities" ADD CONSTRAINT "user_availabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_requirements_locationId_fkey') THEN
        ALTER TABLE "shift_requirements" ADD CONSTRAINT "shift_requirements_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_requirements_jobRoleId_fkey') THEN
        ALTER TABLE "shift_requirements" ADD CONSTRAINT "shift_requirements_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "job_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_userId_fkey') THEN
        ALTER TABLE "shifts" ADD CONSTRAINT "shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_locationId_fkey') THEN
        ALTER TABLE "shifts" ADD CONSTRAINT "shifts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_jobRoleId_fkey') THEN
        ALTER TABLE "shifts" ADD CONSTRAINT "shifts_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "job_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_UserJobRoles_A_fkey') THEN
        ALTER TABLE "_UserJobRoles" ADD CONSTRAINT "_UserJobRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "job_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_UserJobRoles_B_fkey') THEN
        ALTER TABLE "_UserJobRoles" ADD CONSTRAINT "_UserJobRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
