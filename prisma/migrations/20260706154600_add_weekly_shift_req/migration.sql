-- CreateTable
CREATE TABLE IF NOT EXISTS "weekly_shift_requirements" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "weekly_shift_requirements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_shift_requirements_locationId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_shift_requirements_locationId_fkey') THEN
        ALTER TABLE "weekly_shift_requirements" ADD CONSTRAINT "weekly_shift_requirements_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_shift_requirements_jobRoleId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_shift_requirements_jobRoleId_fkey') THEN
        ALTER TABLE "weekly_shift_requirements" ADD CONSTRAINT "weekly_shift_requirements_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "job_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $$;
