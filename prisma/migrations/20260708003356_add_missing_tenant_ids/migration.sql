-- Migration: Add tenantId to 33 models for full SaaS isolation

ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tables_tenantId_fkey') THEN ALTER TABLE "tables" ADD CONSTRAINT "tables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_tenantId_fkey') THEN ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_tenantId_fkey') THEN ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_transactions_tenantId_fkey') THEN ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "group_order_sessions" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_order_sessions_tenantId_fkey') THEN ALTER TABLE "group_order_sessions" ADD CONSTRAINT "group_order_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "customer_groups" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_groups_tenantId_fkey') THEN ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "staff_password_reset_tokens" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_password_reset_tokens_tenantId_fkey') THEN ALTER TABLE "staff_password_reset_tokens" ADD CONSTRAINT "staff_password_reset_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "legal_pages" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legal_pages_tenantId_fkey') THEN ALTER TABLE "legal_pages" ADD CONSTRAINT "legal_pages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "cookie_categories" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cookie_categories_tenantId_fkey') THEN ALTER TABLE "cookie_categories" ADD CONSTRAINT "cookie_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "registration_bonus_records" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registration_bonus_records_tenantId_fkey') THEN ALTER TABLE "registration_bonus_records" ADD CONSTRAINT "registration_bonus_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "cookie_consents" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cookie_consents_tenantId_fkey') THEN ALTER TABLE "cookie_consents" ADD CONSTRAINT "cookie_consents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "invite_tokens" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invite_tokens_tenantId_fkey') THEN ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automation_rules_tenantId_fkey') THEN ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_tenantId_fkey') THEN ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "erp_recipe_mappings" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'erp_recipe_mappings_tenantId_fkey') THEN ALTER TABLE "erp_recipe_mappings" ADD CONSTRAINT "erp_recipe_mappings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_tenantId_fkey') THEN ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_attendance_tenantId_fkey') THEN ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "attendance_correction_requests" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_correction_requests_tenantId_fkey') THEN ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_tenantId_fkey') THEN ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "job_roles" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_roles_tenantId_fkey') THEN ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "user_availabilities" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_availabilities_tenantId_fkey') THEN ALTER TABLE "user_availabilities" ADD CONSTRAINT "user_availabilities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "staff_time_off" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_time_off_tenantId_fkey') THEN ALTER TABLE "staff_time_off" ADD CONSTRAINT "staff_time_off_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "shift_requirements" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_requirements_tenantId_fkey') THEN ALTER TABLE "shift_requirements" ADD CONSTRAINT "shift_requirements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "weekly_shift_requirements" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_shift_requirements_tenantId_fkey') THEN ALTER TABLE "weekly_shift_requirements" ADD CONSTRAINT "weekly_shift_requirements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_tenantId_fkey') THEN ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "payroll_periods" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_periods_tenantId_fkey') THEN ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_tenantId_fkey') THEN ALTER TABLE "payslips" ADD CONSTRAINT "payslips_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "payslip_items" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslip_items_tenantId_fkey') THEN ALTER TABLE "payslip_items" ADD CONSTRAINT "payslip_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "insurance_profiles" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insurance_profiles_tenantId_fkey') THEN ALTER TABLE "insurance_profiles" ADD CONSTRAINT "insurance_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "employment_records" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employment_records_tenantId_fkey') THEN ALTER TABLE "employment_records" ADD CONSTRAINT "employment_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "leave_balances" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_balances_tenantId_fkey') THEN ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "attendance_anomalies" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_anomalies_tenantId_fkey') THEN ALTER TABLE "attendance_anomalies" ADD CONSTRAINT "attendance_anomalies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_documents_tenantId_fkey') THEN ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

