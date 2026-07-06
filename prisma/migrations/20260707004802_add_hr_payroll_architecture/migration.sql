-- CreateEnum
DO $ BEGIN
    DO $ BEGIN
    DO $ BEGIN
    CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

-- CreateEnum
DO $ BEGIN
    DO $ BEGIN
    DO $ BEGIN
    CREATE TYPE "PayslipStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

-- CreateEnum
DO $ BEGIN
    DO $ BEGIN
    DO $ BEGIN
    CREATE TYPE "PayslipItemType" AS ENUM ('ALLOWANCE', 'DEDUCTION', 'OVERTIME', 'BASE_PAY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

-- CreateEnum
DO $ BEGIN
    DO $ BEGIN
    DO $ BEGIN
    CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

-- CreateEnum
DO $ BEGIN
    DO $ BEGIN
    DO $ BEGIN
    CREATE TYPE "AnomalyType" AS ENUM ('LATE', 'EARLY_LEAVE', 'ABSENT', 'MISSED_PUNCH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

-- CreateEnum
DO $ BEGIN
    DO $ BEGIN
    DO $ BEGIN
    CREATE TYPE "DocumentType" AS ENUM ('ID_CARD', 'BANK_BOOK', 'HEALTH_CERTIFICATE', 'CONTRACT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

-- CreateEnum
DO $ BEGIN
    DO $ BEGIN
    DO $ BEGIN
    CREATE TYPE "DocumentStatus" AS ENUM ('VALID', 'EXPIRED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

-- CreateTable
CREATE TABLE IF NOT EXISTS "payroll_periods" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payslips" (
    "id" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "totalOvertime" DOUBLE PRECISION NOT NULL,
    "totalAllowances" DOUBLE PRECISION NOT NULL,
    "totalDeductions" DOUBLE PRECISION NOT NULL,
    "netPay" DOUBLE PRECISION NOT NULL,
    "status" "PayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payslip_items" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PayslipItemType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "payslip_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "insurance_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "laborInsuranceBracket" DOUBLE PRECISION NOT NULL,
    "healthInsuranceBracket" DOUBLE PRECISION NOT NULL,
    "pensionEmployer" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "pensionEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dependents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "insurance_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "employment_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hireDate" DATE NOT NULL,
    "terminationDate" DATE,
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "bankName" TEXT,
    "bankBranch" TEXT,
    "bankAccountNumber" TEXT,

    CONSTRAINT "employment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "leave_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "year" INTEGER NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "attendance_anomalies" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "type" "AnomalyType" NOT NULL,
    "severity" TEXT,
    "description" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "employee_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "expiryDate" DATE,
    "status" "DocumentStatus" NOT NULL DEFAULT 'VALID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "insurance_profiles_userId_key" ON "insurance_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "employment_records_userId_key" ON "employment_records"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "leave_balances_userId_leaveType_year_key" ON "leave_balances"("userId", "leaveType", "year");

-- AddForeignKey
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_periods_locationId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_periods_locationId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_periods_locationId_fkey') THEN
        ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $;
    END IF;
END $;

-- AddForeignKey
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_payrollPeriodId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_payrollPeriodId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_payrollPeriodId_fkey') THEN
        ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $;
    END IF;
END $;

-- AddForeignKey
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_userId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_userId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_userId_fkey') THEN
        ALTER TABLE "payslips" ADD CONSTRAINT "payslips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $;
    END IF;
END $;

-- AddForeignKey
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslip_items_payslipId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslip_items_payslipId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslip_items_payslipId_fkey') THEN
        ALTER TABLE "payslip_items" ADD CONSTRAINT "payslip_items_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $;
    END IF;
END $;

-- AddForeignKey
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insurance_profiles_userId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insurance_profiles_userId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insurance_profiles_userId_fkey') THEN
        ALTER TABLE "insurance_profiles" ADD CONSTRAINT "insurance_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $;
    END IF;
END $;

-- AddForeignKey
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employment_records_userId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employment_records_userId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employment_records_userId_fkey') THEN
        ALTER TABLE "employment_records" ADD CONSTRAINT "employment_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $;
    END IF;
END $;

-- AddForeignKey
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_balances_userId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_balances_userId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_balances_userId_fkey') THEN
        ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $;
    END IF;
END $;

-- AddForeignKey
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_anomalies_attendanceId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_anomalies_attendanceId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_anomalies_attendanceId_fkey') THEN
        ALTER TABLE "attendance_anomalies" ADD CONSTRAINT "attendance_anomalies_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "staff_attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $;
    END IF;
END $;

-- AddForeignKey
DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_documents_userId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_documents_userId_fkey') THEN
        DO $ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_documents_userId_fkey') THEN
        ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $;
    END IF;
END $;
    END IF;
END $;

