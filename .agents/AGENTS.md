# Kitchenasty Project Rules

## 1. i18n Sync Requirement
**Trigger**: When adding or modifying translation keys (e.g., in `zh-TW.json`).
**Rule**: This project supports 13 languages. Whenever you add or update translation keys for any feature, you MUST ensure that all corresponding keys are added to ALL 13 language files (`en.json`, `es.json`, `fr.json`, `de.json`, `it.json`, `ja.json`, `ko.json`, `pt.json`, `th.json`, `tl.json`, `vi.json`, `id.json`, `zh-TW.json`) to keep the i18n system fully synced.

## 2. Prisma Migration Requirement
**Trigger**: When making any changes to the Prisma schema (`schema.prisma` or `shutter-erp.prisma`).
**Rule**: Because this project is deployed remotely (e.g., on Railway) and relies on `npx prisma migrate deploy` during startup, you MUST generate a Prisma migration file whenever you modify the database schema. 
- Do NOT just run `npx prisma db push` without generating a migration file. 
- If you are operating in a non-interactive environment where `npx prisma migrate dev` fails, you must manually create a timestamped folder under `prisma/migrations` containing a `migration.sql` script with the exact SQL DDL statements for your changes, and mark it as resolved locally if necessary.
