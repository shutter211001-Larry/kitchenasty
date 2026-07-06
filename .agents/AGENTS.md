# Kitchenasty Project Rules

## 1. i18n Sync Requirement
**Trigger**: When modifying translation JSON files, OR when adding new UI labels, menu items, or texts in the codebase that use translation keys (e.g., `t('some.key')` or `label: 'nav.someKey'`).
**Rule**: This project supports 13 languages. Whenever you reference a NEW translation key in the code, you MUST immediately check if it exists in the translation files. You MUST ensure that the key is added to ALL 13 language files (`en.json`, `es.json`, `fr.json`, `de.json`, `it.json`, `ja.json`, `ko.json`, `pt.json`, `th.json`, `tl.json`, `vi.json`, `id.json`, `zh-TW.json`) located in `packages/adminfront/src/i18n/locales/` to keep the i18n system fully synced. Do NOT leave the keys undefined.
- **No Language Prefixes**: When automatically injecting fallback values or testing translations into the JSON files, DO NOT prepend the strings with language tags like `[ZH-TW]` or `[EN]`. Insert the raw string or English fallback directly so the UI remains clean.

## 2. Prisma Migration Requirement
**Trigger**: When making any changes to the Prisma schema (`schema.prisma` or `shutter-erp.prisma`).
**Rule**: Because this project is deployed remotely (e.g., on Railway) and relies on `npx prisma migrate deploy` during startup, you MUST generate a Prisma migration file whenever you modify the database schema. 
- Do NOT just run `npx prisma db push` without generating a migration file. 
- If you are operating in a non-interactive environment where `npx prisma migrate dev` fails, you must manually create a timestamped folder under `prisma/migrations` containing a `migration.sql` script with the exact SQL DDL statements for your changes.
- CRITICAL (BOM Prevention): When creating `migration.sql` manually, you MUST use the native `write_to_file` tool to ensure it is saved as UTF-8 without BOM. NEVER use Windows PowerShell commands (like `Add-Content` or `>`) to generate the file, as PowerShell injects a `\u{feff}` BOM that will crash PostgreSQL on Railway.
- CRITICAL (Idempotency): You MUST write idempotent SQL (e.g., `ALTER TABLE "table" ADD COLUMN IF NOT EXISTS "column" TEXT;`). This prevents `502 Bad Gateway` deployment crash loops on Railway.
- CRITICAL (Recovery): If a deployment fails due to a migration error on Railway, the database will be locked. You must use `npx prisma migrate resolve --rolled-back <migration_name>` with the target `DATABASE_URL` to unblock it.

## 3. open-location-code Typings Workaround
**Trigger**: When using or implementing the \open-location-code\ library in TypeScript.
**Rule**: The \@types/open-location-code\ package incorrectly defines methods such as \isValid\, \isFull\, and \decode\ as \static\ methods. However, at runtime, these are instance methods on the prototype. To avoid TypeScript compilation errors (e.g., \Property 'isValid' does not exist on type 'OpenLocationCode'\), you MUST instantiate the class and cast it to \ ny\ before calling these methods.
- Correct usage: \const olc: any = new OpenLocationCode(); olc.isValid(code);\
- Incorrect usage: \OpenLocationCode.isValid(code);\ (Fails at runtime)
- Incorrect usage: \const olc = new OpenLocationCode(); olc.isValid(code);\ (Fails TS compilation)

## 4. Prisma Client Generation Requirement
**Trigger**: When modifying the Prisma schema.
**Rule**: In addition to generating a migration file, ALWAYS run `npx prisma generate` locally so the TypeScript compiler and IDE language server can recognize the new Prisma types (like new models or fields).

## 5. Zod Schema Sync Requirement
**Trigger**: When adding new fields to Prisma models that are updated via API endpoints (like `Location`).
**Rule**: You MUST also update the corresponding Zod validation schemas (e.g. `createLocationSchema`) in the relevant controller. If you forget to update the Zod schema, the new fields will be silently stripped from the request body by `.safeParse()`.

## 6. Express Route Mounting Requirement
**Trigger**: When creating a new API route file (e.g., `leave.routes.ts`).
**Rule**: You MUST remember to import and mount the new route file in `app.ts` (e.g. `app.use('/api/xxx', xxxRoutes)`). The route will not work until it is explicitly mounted in the Express app.

## 7. AdminFront API Client Generics Requirement
**Trigger**: When making API calls in the frontend (e.g., using `api.get`, `api.post` from `src/lib/api.ts`).
**Rule**: The custom API client in `adminfront` uses generics (e.g., `<T>`) and operates under strict TypeScript rules. If you do not provide a type argument, the response defaults to `unknown`, causing TS18046 build errors. You MUST always explicitly provide the expected generic type argument.
- **Example**: `api.get<{ data: any[] }>('/path').then(res => set(res.data))`
- **Important**: Unlike Axios, this custom client directly returns the JSON payload. Do NOT access `res.data.data` unless the server actually deeply nests the data. If the server sends `{ success: true, data: [...] }`, the generic type should be `<{ success?: boolean, data: T }>` and you access the array via `res.data`.

## 8. Web Bluetooth API Typings Requirement
**Trigger**: When encountering TypeScript build errors related to the Web Bluetooth API (e.g., `Cannot find name 'BluetoothDevice'` or `Property 'bluetooth' does not exist on type 'Navigator'`).
**Rule**: The standard TypeScript `lib.dom.d.ts` does not include Web Bluetooth types. You MUST install the `@types/web-bluetooth` package as a dev dependency in the relevant workspace (e.g., `npm install -D @types/web-bluetooth -w @shutter/adminfront`) to resolve these errors.

## 9. AdminFront Shutter-ERP Route Prefixing
**Trigger**: When fetching backend Shutter-ERP API endpoints from the frontend `adminfront` app.
**Rule**: The backend Express server mounts the Shutter-ERP router under the `/shutter-erp` prefix (e.g., `app.use('/shutter-erp', shutterErpRouter);`). However, the `adminfront` API client (`src/lib/api.ts`) automatically prepends `/api` to all requests. To correctly route to the ERP endpoints and prevent 404 errors, you MUST prefix the fetch path with `/../shutter-erp/api/` instead of just `/` or `/api/`.
- **Correct usage**: `api.get<T>('/../shutter-erp/api/finance/pnl')`
- **Incorrect usage**: `api.get<T>('/finance/pnl')` or `api.get<T>('/api/finance/pnl')`

## 10. Language Preference
**Trigger**: Always.
**Rule**: You MUST always communicate and respond to the user in Traditional Chinese (繁體中文), unless the user explicitly requests another language for a specific task.

## 11. Taiwan Labor Standards Act Compliance (HR Design)
**Trigger**: When designing, modifying, or implementing any Human Resources (HR) features, including but not limited to Payroll, Shift Scheduling (Roster), Attendance, Leave management, and HR database schemas.
**Rule**: You MUST strictly comply with the Taiwan Labor Standards Act. Before proposing any design or modifying HR code, you MUST first read and reference docs/HR_LABOR_LAWS_TW.md for the correct multipliers, legal limits, and domain knowledge. Do not invent payroll logic without consulting this document.

## 12. 伺服器時區漂移防範 (Timezone Drift Prevention)
**Trigger**: When performing Date operations (like getting the day of week or day of month) on Date objects fetched from the database (Prisma) in the backend API.
**Rule**: Dates like `req.date` or `shift.date` are parsed by Prisma as UTC Midnight objects (e.g., `2026-07-10T00:00:00.000Z`). You MUST NEVER use `.getDay()`, `.getDate()`, or `.setDate()` on these objects, as it will evaluate the date in the local timezone of the deployment server (which may be in the US), causing "Timezone Drift" bugs where the day shifts to the previous day. 
- **Correct usage**: `.getUTCDay()`, `.getUTCDate()`, `.setUTCDate()`
- **Incorrect usage**: `.getDay()`, `.getDate()`, `.setDate()`
