const fs = require('fs');
const path = require('path');

const migrationPath = path.resolve(__dirname, '../../prisma/migrations/20260707004802_add_hr_payroll_architecture/migration.sql');
let content = fs.readFileSync(migrationPath, 'utf8');

// 1. Enums
content = content.replace(/CREATE TYPE "([^"]+)" AS ENUM \(([^)]+)\);/g, `DO $$ BEGIN
    CREATE TYPE "$1" AS ENUM ($2);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;`);

// 2. Tables
content = content.replace(/CREATE TABLE "([^"]+)" \(/g, 'CREATE TABLE IF NOT EXISTS "$1" (');

// 3. Indexes
content = content.replace(/CREATE (UNIQUE )?INDEX "([^"]+)" ON "([^"]+)"\(([^)]+)\);/g, 'CREATE $1INDEX IF NOT EXISTS "$2" ON "$3"($4);');

// 4. Foreign Keys
// Note: We'll just wrap the whole FK section in DO $$ BEGIN ... END $$;
// Actually, it's easier to do it line by line:
content = content.replace(/ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" FOREIGN KEY \(([^)]+)\) REFERENCES "([^"]+)"\(([^)]+)\)(.*);/g, `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '$2') THEN
        ALTER TABLE "$1" ADD CONSTRAINT "$2" FOREIGN KEY ($3) REFERENCES "$4"($5)$6;
    END IF;
END $$;`);

fs.writeFileSync(migrationPath, content);
console.log('Migration made idempotent.');
