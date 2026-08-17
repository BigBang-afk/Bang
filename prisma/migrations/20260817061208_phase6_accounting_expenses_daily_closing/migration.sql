-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('OTHER_INCOME', 'SERVICE_INCOME', 'MISC_INCOME');

-- CreateEnum
CREATE TYPE "DailyClosingStatus" AS ENUM ('OPEN', 'PENDING_REVIEW', 'CLOSED', 'REOPENED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'EXPENSE_CATEGORY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'EXPENSE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'EXPENSE_VOIDED';
ALTER TYPE "AuditAction" ADD VALUE 'INCOME_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'INCOME_VOIDED';
ALTER TYPE "AuditAction" ADD VALUE 'DAILY_CLOSING_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'DAY_CLOSED';
ALTER TYPE "AuditAction" ADD VALUE 'DAY_REOPENED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_EXPORTED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCIAL_RECONCILIATION_PERFORMED';

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sequence" SERIAL NOT NULL,
    "categoryId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "expenseDate" DATE NOT NULL,
    "reference" TEXT,
    "vendorName" TEXT,
    "notes" TEXT,
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "voidedById" UUID,
    "voidedAt" TIMESTAMP(3),
    "reversalOfId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incomes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sequence" SERIAL NOT NULL,
    "incomeType" "IncomeType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "incomeDate" DATE NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "voidedById" UUID,
    "voidedAt" TIMESTAMP(3),
    "reversalOfId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_closings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessDate" DATE NOT NULL,
    "status" "DailyClosingStatus" NOT NULL DEFAULT 'OPEN',
    "openingCash" DECIMAL(14,2) NOT NULL,
    "cashReceived" DECIMAL(14,2) NOT NULL,
    "cashPaid" DECIMAL(14,2) NOT NULL,
    "cashAdjustments" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expectedClosingCash" DECIMAL(14,2) NOT NULL,
    "physicalCashAmount" DECIMAL(14,2),
    "cashDifference" DECIMAL(14,2),
    "unresolvedIssues" JSONB,
    "notes" TEXT,
    "submittedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "closedById" UUID,
    "closedAt" TIMESTAMP(3),
    "reopenedById" UUID,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_closings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_sequence_key" ON "expenses"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_reversalOfId_key" ON "expenses"("reversalOfId");

-- CreateIndex
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_expenseDate_idx" ON "expenses"("expenseDate");

-- CreateIndex
CREATE INDEX "expenses_createdAt_idx" ON "expenses"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "incomes_sequence_key" ON "incomes"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "incomes_reversalOfId_key" ON "incomes"("reversalOfId");

-- CreateIndex
CREATE INDEX "incomes_incomeType_idx" ON "incomes"("incomeType");

-- CreateIndex
CREATE INDEX "incomes_status_idx" ON "incomes"("status");

-- CreateIndex
CREATE INDEX "incomes_incomeDate_idx" ON "incomes"("incomeDate");

-- CreateIndex
CREATE INDEX "incomes_createdAt_idx" ON "incomes"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_closings_businessDate_key" ON "daily_closings"("businessDate");

-- CreateIndex
CREATE INDEX "daily_closings_status_idx" ON "daily_closings"("status");

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "incomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_reopenedById_fkey" FOREIGN KEY ("reopenedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

