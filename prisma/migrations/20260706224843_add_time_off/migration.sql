CREATE TABLE IF NOT EXISTS "staff_time_off" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "date" DATE NOT NULL, "reason" TEXT, CONSTRAINT "staff_time_off_pkey" PRIMARY KEY ("id")); CREATE UNIQUE INDEX IF NOT EXISTS "staff_time_off_userId_date_key" ON "staff_time_off"("userId", "date"); ALTER TABLE "staff_time_off" DROP CONSTRAINT IF EXISTS "staff_time_off_userId_fkey"; DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_time_off_userId_fkey') THEN
        ALTER TABLE "staff_time_off" ADD CONSTRAINT "staff_time_off_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $;
