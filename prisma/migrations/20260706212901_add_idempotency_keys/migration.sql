ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotencyKey_key" ON "orders"("idempotencyKey");

ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "staff_attendance_idempotencyKey_key" ON "staff_attendance"("idempotencyKey");
