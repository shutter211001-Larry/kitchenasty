-- The admin UI supports multiple opening sessions per day.
-- Older databases still have the original one-row-per-day unique index.
DROP INDEX IF EXISTS "operating_hours_locationId_dayOfWeek_key";
