ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "descriptionTranslations" JSONB, ADD COLUMN IF NOT EXISTS "nameTranslations" JSONB;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "descriptionTranslations" JSONB, ADD COLUMN IF NOT EXISTS "nameTranslations" JSONB, ADD COLUMN IF NOT EXISTS "unitTranslations" JSONB;
ALTER TABLE "menu_options" ADD COLUMN IF NOT EXISTS "nameTranslations" JSONB;
ALTER TABLE "menu_option_values" ADD COLUMN IF NOT EXISTS "nameTranslations" JSONB;
ALTER TABLE "mealtimes" ADD COLUMN IF NOT EXISTS "nameTranslations" JSONB;
ALTER TABLE "allergens" ADD COLUMN IF NOT EXISTS "nameTranslations" JSONB;
ALTER TABLE "dietary_preferences" ADD COLUMN IF NOT EXISTS "nameTranslations" JSONB;
ALTER TABLE "cookie_categories" ADD COLUMN IF NOT EXISTS "labelTranslations" JSONB, ADD COLUMN IF NOT EXISTS "descriptionTranslations" JSONB;
