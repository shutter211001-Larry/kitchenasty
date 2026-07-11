# Learning Proposal: Update Prisma Migration Rules for Multi-Schema Danger

## 1. Identify What to Learn
在稍早的除錯過程中，當我發現資料庫遺漏了 `prepTime` 欄位時，我嘗試使用 `npx prisma db push` 來快速同步資料表結構。但我立刻收到了嚴重的警告：**Prisma 試圖刪除所有 ERP 相關的資料表（如 Action, Recipe 等）以及 tenantId 欄位！**

這是因為這個專案共用同一個 PostgreSQL 資料庫，但卻使用了**兩個不同的 Prisma Schema** (`schema.prisma` 與 `shutter-erp.prisma`)。對其中一個執行 `db push`，會讓 Prisma 誤以為另一個 Schema 的資料表是「不該存在的孤兒資料表」而試圖全數抹除。
最後我成功改用 `npx prisma db execute` 執行手寫的 SQL，再用 `npx prisma migrate resolve` 標記完成，才安全地繞過這個災難。

## 2. Classify: Rule vs. Skill
這屬於 **Rule (規則) 的擴充**。現有的 **Rule 2 (Prisma Migration Requirement)** 已經規範了不能只用 `db push` 而不生 migration 檔，但我們需要更強烈地「完全禁止」使用 `db push`，並提供在本地開發環境遇到報錯時的正確手動同步指令。

## 3. Create vs. Update
**Update Existing**: 將會更新 `AGENTS.md` 中的 Rule 2。

## 4. Proposed Modification to AGENTS.md

修改 **Rule 2**，在現有的項目中新增關於 `db push` 災難與 `db execute` 的嚴格守則：

```diff
  ## 2. Prisma Migration Requirement
  **Trigger**: When making any changes to the Prisma schema (`schema.prisma` or `shutter-erp.prisma`).
  **Rule**: Because this project is deployed remotely (e.g., on Railway) and relies on `npx prisma migrate deploy` during startup, you MUST generate a Prisma migration file whenever you modify the database schema. 
- - Do NOT just run `npx prisma db push` without generating a migration file. 
+ - CRITICAL (Multi-Schema Danger): NEVER run `npx prisma db push`! This project uses multiple schemas (`schema.prisma` and `shutter-erp.prisma`) sharing the same database. Running `db push` will cause Prisma to aggressively DROP all tables belonging to the other schema, leading to massive data loss.
  - If you are operating in a non-interactive environment where `npx prisma migrate dev` fails, you must manually create a timestamped folder under `prisma/migrations` containing a `migration.sql` script with the exact SQL DDL statements for your changes.
+ - To apply a manual `migration.sql` locally, you MUST use `npx prisma db execute --file <path_to_sql> --schema <schema.prisma>`, and then mark it as applied using `npx prisma migrate resolve --applied <migration_folder_name>`.
  - CRITICAL (BOM Prevention): When creating `migration.sql` manually, you MUST use the native `write_to_file` tool to ensure it is saved as UTF-8 without BOM. NEVER use Windows PowerShell commands (like `Add-Content` or `>`) to generate the file, as PowerShell injects a `\u{feff}` BOM that will crash PostgreSQL on Railway.
```

---
**請確認這個學習提案！** 
如果您同意這個修改，點擊 Proceed 後，我會將這段防止刪庫跑路的嚴格規範更新到您的 `AGENTS.md` 中，確保未來的 AI 絕對不會手癢去執行 `prisma db push`！
