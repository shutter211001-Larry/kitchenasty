-- Drop the global unique index on email
DROP INDEX IF EXISTS "users_email_key";

-- Create the new unique index on tenantId and email
CREATE UNIQUE INDEX IF NOT EXISTS "users_tenantId_email_key" ON "users"("tenantId", "email");
