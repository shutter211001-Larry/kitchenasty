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
- CRITICAL (Idempotency): You MUST write idempotent SQL to prevent `502 Bad Gateway` deployment crash loops on Railway. **Prisma does NOT generate idempotent SQL automatically**. After running `npx prisma migrate dev`, you MUST manually edit the generated `migration.sql` file and apply the following idempotency patterns:
  - Change `CREATE TABLE "table"` to `CREATE TABLE IF NOT EXISTS "table"`.
  - Wrap `CREATE TYPE` (Enums) in a DO block: `DO $$ BEGIN CREATE TYPE "Type" AS ENUM ('A'); EXCEPTION WHEN duplicate_object THEN null; END $$;`
  - Use `IF NOT EXISTS` for columns: `ALTER TABLE "table" ADD COLUMN IF NOT EXISTS "column" TEXT;`
  - Wrap `ADD CONSTRAINT` (Foreign Keys) in a DO block: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_name') THEN ALTER TABLE "table" ADD CONSTRAINT "fk_name" FOREIGN KEY ...; END IF; END $$;`
- CRITICAL (Recovery): If a deployment fails due to a migration error on Railway (e.g. `string contains embedded null`), the database will be locked. You must use `npx prisma migrate resolve --rolled-back <migration_name>` with the target `DATABASE_URL` to unblock it.
- If a migration file is already corrupted with a UTF-16 BOM, DO NOT use standard shell commands to fix it. You must write a Node.js script using `fs.readFileSync` to read the raw buffer, detect `0xff 0xfe` or null bytes, and rewrite it explicitly as `utf8` before pushing the fix.

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

## 13. Prisma JSON Serialization & Frontend Null Checks
**Trigger**: When writing frontend logic that checks for `null` on data fetched from the backend (Prisma).
**Rule**: Prisma's `select` omits unspecified fields entirely. When serialized to JSON, omitted fields become `undefined`, not `null`. You MUST ensure frontend checks account for both `null` and `undefined` (e.g., `user.tenantId !== null && user.tenantId !== undefined` or `user.tenantId != null` using loose equality) to prevent false-positive strict equality failures.

## 14. PowerShell Backtick Escaping Danger (React/TSX)
**Trigger**: When writing or replacing entire code files that contain template literals (`` ` ``), especially React/TSX files.
**Rule**: NEVER use PowerShell here-strings (`@"..."@`) via `run_command` to write code containing backticks. PowerShell will evaluate the backticks as escape characters and destroy the template literals. You MUST ALWAYS use the native `write_to_file` or `replace_file_content` tools to write or modify source code.

## 15. UI Text Language Requirement (Traditional Chinese)
**Trigger**: When designing, generating, or modifying User Interface (UI) components, pages, or hardcoded strings.
**Rule**: You MUST use Traditional Chinese (繁體中文) for all UI text, labels, and placeholders by default, unless the text is explicitly part of the i18n translation system (in which case you should follow Rule 1). Do not use English for user-facing UI elements unless specifically requested.

## 16. SaaS Platform vs. Tenant Admin UI Distinction
**Trigger**: When designing pages (especially Login pages and Dashboards) for the SaaS Super Admin platform (`saasfront`).
**Rule**: You MUST visually differentiate the `saasfront` UI from the tenant-facing `adminfront` UI. 
- Use distinct titles (e.g., "SaaS 平台超級管理員登入" instead of "餐廳管理員登入").
- Use a distinct color scheme or branding elements so that the user immediately knows they are logging into the central SaaS control panel, not a specific restaurant's backend.

## 17. SiteSettings Hardcoded ID Workaround (Prisma)
**Trigger**: When writing Prisma Client code to `create` a new `SiteSettings` record (e.g., as a nested `create` when creating a `Tenant`).
**Rule**: The `SiteSettings` model in `schema.prisma` defines its primary key as `id String @id @default("default")`. If you do not explicitly provide an `id` when creating a record, Prisma will attempt to insert "default", leading to a `P2002` Unique Constraint violation if a settings record already exists. You MUST ALWAYS explicitly provide a generated UUID (e.g., `id: require('crypto').randomUUID()`) for the `id` field when creating a `SiteSettings` record.

## 18. AdminFront API Client Requirement (No Native Fetch)
**Trigger**: When modifying, creating, or refactoring components/hooks in "adminfront" that make HTTP requests.
**Rule**: NEVER use the native `fetch()` API. The backend requires multi-tenant headers (`x-tenant-id`) to authorize requests on "localhost". The native `fetch()` does not append these headers, causing 401 Unauthorized or 400 Bad Request errors. You MUST always import the custom API client (`import { api } from '../lib/api.js';`) and use `api.get`, `api.post`, `api.put`, etc. 

When refactoring from `fetch` or writing new API calls, strictly follow these API Client usage rules:
- **No `.json()`**: The client automatically parses and returns the JSON payload. NEVER chain `await res.json()`, as it will throw a `TypeError: res.json is not a function` and crash the app. Use the return value directly (e.g., `const data = await api.get('/path');`).
- **No `res.ok` Checks**: The client automatically throws an error for non-2xx responses. The returned value is the raw JSON data object (which does NOT have an `ok` property). NEVER write `if (!res.ok)` checks, as it will evaluate to true and falsely throw errors on successful requests.
- **Leading Slashes**: ALWAYS start the API path with a forward slash `/` (e.g., `api.post('/auth/login')`) to prevent broken URL concatenation (e.g., `/apiauth/login` 404 Not Found).
- **No Manual Stringification**: The client automatically stringifies the request body. Pass the raw object directly (e.g., `api.post('/path', { email })`), do NOT use `JSON.stringify()`, which would double-stringify the payload and cause `Unexpected token '"'` 400 Bad Request errors in the backend.

## 19. Prisma Multi-Tenancy Data Leak Prevention (Raw SQL & Child Models)
**Trigger**: When writing or modifying Prisma queries in the backend API (specifically $queryRaw, $executeRaw, or querying child models like "OrderItem" that lack a direct "tenantId" column).
**Rule**: The Prisma multi-tenancy extension in "db.ts" ONLY automatically injects "tenantId" filters into standard operations for models explicitly listed in "tenantAwareModels". 
- **Raw SQL**: The extension does NOT intercept "" or "". You MUST manually extract "tenantId" ("const tenantId = tenantStorage.getStore()?.tenantId;") and explicitly add "AND "tenantId" = " to the "WHERE" clause of your raw SQL.
- **Child Models**: Models like "OrderItem" are not tenant-aware directly. When querying or grouping them, you MUST manually add a relation filter (e.g., "where: { order: { tenantId } }") to prevent global data leakage across tenants.

## 20. Windows Prisma Query Engine File Lock Prevention
**Trigger**: When needing to run `npm install`, `npm update`, or `npm uninstall` in the workspace while working on a machine running Windows.
**Rule**: Because the backend uses Prisma, the Node.js process locks the Prisma Query Engine file (`query_engine-windows.dll.node`) during execution. If you run `npm install` while the backend (`api-server`) is running, npm will fail with an `EPERM` error and corrupt the Prisma Client. 
- You MUST ALWAYS use the `manage_task` tool to **kill** the backend server task (`npm run dev:api-server`) BEFORE running any `npm install` commands.
- After the installation is complete, you MUST restart the server.
- If the Prisma client becomes corrupted, you must run `npx prisma generate` for ALL schemas (e.g., `npx prisma generate` and `npx prisma generate --schema=prisma/erp/shutter-erp.prisma`) to recover.

## 21. Shutter SaaS System Architecture (Services & Databases)
**Trigger**: When deploying, starting, troubleshooting, or writing documentation about the Shutter SaaS system architecture.
**Rule**: You MUST remember that the Shutter SaaS platform consists of exactly **6 core services**:
1. **1 Shared Database**: `Shutter DB` (PostgreSQL) - The main database and ERP database have been merged into a single database. Do not assume there are two separate databases.
2. **1 Backend Server**: `api-server` - The central REST API and WebSocket server.
3. **4 Frontend Applications**: 
   - `adminfront` (Tenant Admin UI)
   - `storefront` (Customer Ordering UI)
   - `erpfront` (Headquarters ERP UI)
   - `saasfront` (SaaS Super Admin Platform)
When listing environment variables for URLs, ensure all 4 frontends are accounted for (e.g., `SAAS_URL_PUBLIC`, `STORE_URL_PUBLIC`, `ADMIN_URL_PUBLIC`, `ERP_URL_PUBLIC`).

## 22. Shutter Core Functional Domains (業務功能架構)
**Trigger**: When exploring, documenting, debugging, or modifying features within the Shutter system (e.g., POS, HR, Kitchen Display, Marketing).
**Rule**: You MUST be aware of the system's 5 core functional domains to properly navigate the codebase and architect solutions:
1. **Omnichannel Ordering & POS**: (OrderCreate, group-order, LINE Pay, Stripe, Taiwan e-invoice, Counter Display)
2. **Kitchen & Inventory**: (Kitchen Display System/KDS Kanban, Stock Management, Web Bluetooth Printer)
3. **Menu & Franchise Management**: (AI Menu Detection, Infinite category levels, modifiers, Delivery Zones, Location management)
4. **HR & Payroll (TW Labor Law Compliant)**: (QR Code Attendance, Payroll calculations, Shift/Roster Requirements, Leave Approvals, Job Roles)
5. **CRM & Marketing**: (Customer Loyalty, Coupons, LINE OA integration, Automation Rules, Consent/Audit Logs)
When working on any of these areas, always refer to this architecture to ensure you are modifying the correct domain files (e.g., `adminfront/src/pages` or `api-server/src/routes`).

## 23. Express CORS & URL Normalization Sync
**Trigger**: When adding a new frontend application to the SaaS architecture (e.g., adding `SAAS_URL_PUBLIC`) or modifying frontend URLs.
**Rule**: You MUST ensure that the new URL environment variable is added to BOTH the URL normalization array (around line 10) AND the `corsOrigins` array in `packages/api-server/src/app.ts`. The `api-server` manually normalizes and whitelists these specific keys. If you omit the new variable, the frontend will be permanently blocked by CORS on production deployments.

## 24. 嚴格的本地測試與發布流程 (Strict Local Verification & Release Flow)
**Trigger**: When completing a code modification task, especially before running `git commit`, `git push`, or reporting task completion to the user.
**Rule**: You MUST proactively run local verification to ensure your changes compile and function correctly without syntax or build errors. 
- For frontend changes, run the specific build command (e.g., `npm run build -w packages/saasfront`).
- For backend changes, ensure the server builds or runs (e.g., `npm run build -w packages/api-server`).
- You MUST wait for the build/test task to finish successfully.
- ONLY AFTER local verification passes, are you allowed to commit the code, push to the remote repository, and report completion to the user. NEVER push untested code.

## 25. 嚴禁無意義圖示與 Emoji (No Meaningless Icons/Emojis)
**Trigger**: When designing, generating, or modifying User Interface (UI) components or text content.
**Rule**: You MUST NOT use emojis (like 👥, 🏪, ✅, 🚀, etc.) or unnecessary icons simply for decoration. The project requires a clean, professional, and minimalist aesthetic. Only use standard icons (like Lucide icons) when they carry clear semantic meaning or are necessary for UX (e.g., action buttons). Never clutter text with decorative icons.
