-- CreateEnum
CREATE TYPE "InventorySource" AS ENUM ('MANUFACTURED', 'PURCHASED');

-- CreateEnum
CREATE TYPE "KarigarSpecialization" AS ENUM ('GOLDSMITH', 'POLISHER', 'STONE_SETTER', 'DESIGNER', 'REPAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "KarigarStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('KARIGAR', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "GoldLedgerTransactionType" AS ENUM ('GOLD_GIVEN', 'GOLD_RECEIVED', 'GOLD_ADJUSTMENT', 'GOLD_RETURNED', 'GOLD_TRANSFER');

-- CreateEnum
CREATE TYPE "PartyCashTransactionType" AS ENUM ('PURCHASE', 'PAYMENT', 'CASH_PAID', 'CASH_RECEIVED', 'CASH_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CashDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CashTransactionType" AS ENUM ('SALE_PAYMENT', 'CUSTOMER_PAYMENT', 'PURCHASE_PAYMENT', 'SUPPLIER_PAYMENT', 'KARIGAR_PAYMENT', 'KARIGAR_RECEIPT', 'EXPENSE', 'CASH_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('COMPLETED');

-- CreateEnum
CREATE TYPE "JobReconciliationStatus" AS ENUM ('WITHIN_ALLOWANCE', 'EXCESS_DIFFERENCE', 'SHORTAGE');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('MATCHED', 'RECONCILIATION_REQUIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'KARIGAR_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'KARIGAR_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'KARIGAR_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'SUPPLIER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SUPPLIER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SUPPLIER_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'GOLD_GIVEN';
ALTER TYPE "AuditAction" ADD VALUE 'GOLD_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'GOLD_ADJUSTED';
ALTER TYPE "AuditAction" ADD VALUE 'GOLD_JOB_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'KARIGAR_CASH_PAID';
ALTER TYPE "AuditAction" ADD VALUE 'KARIGAR_CASH_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'PURCHASE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PURCHASE_MODIFIED';
ALTER TYPE "AuditAction" ADD VALUE 'SUPPLIER_PAYMENT_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'CASH_TRANSACTION_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'CASH_ADJUSTED';
ALTER TYPE "AuditAction" ADD VALUE 'GOLD_RECONCILIATION_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'CASH_RECONCILIATION_COMPLETED';

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "purchaseItemId" UUID,
ADD COLUMN     "source" "InventorySource" NOT NULL DEFAULT 'MANUFACTURED',
ADD COLUMN     "supplierId" UUID;

-- CreateTable
CREATE TABLE "karigars" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "karigarCode" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "secondaryPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "specialization" "KarigarSpecialization" NOT NULL DEFAULT 'OTHER',
    "status" "KarigarStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "karigars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplierCode" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT NOT NULL,
    "secondaryPhone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partyType" "PartyType" NOT NULL,
    "partyId" UUID NOT NULL,
    "transactionType" "GoldLedgerTransactionType" NOT NULL,
    "purity" "GoldPurity" NOT NULL,
    "debit" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "credit" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "balanceAfter" DECIMAL(10,3) NOT NULL,
    "goldRate" DECIMAL(14,2),
    "goldValue" DECIMAL(14,2),
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gold_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_gold_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partyType" "PartyType" NOT NULL,
    "partyId" UUID NOT NULL,
    "purity" "GoldPurity" NOT NULL,
    "balance" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_gold_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_cash_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partyType" "PartyType" NOT NULL,
    "partyId" UUID NOT NULL,
    "transactionType" "PartyCashTransactionType" NOT NULL,
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_cash_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_cash_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partyType" "PartyType" NOT NULL,
    "partyId" UUID NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_cash_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transactionType" "CashTransactionType" NOT NULL,
    "direction" "CashDirection" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sequence" SERIAL NOT NULL,
    "supplierId" UUID NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNumber" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "totalCharges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchaseId" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "categoryId" UUID,
    "purity" "GoldPurity" NOT NULL,
    "netWeight" DECIMAL(10,3) NOT NULL,
    "wastageType" "WastageType" NOT NULL,
    "wastagePercent" DECIMAL(6,3),
    "wastageWeight" DECIMAL(10,3) NOT NULL,
    "grossWeight" DECIMAL(10,3) NOT NULL,
    "goldRatePerGram" DECIMAL(14,2) NOT NULL,
    "goldValue" DECIMAL(14,2) NOT NULL,
    "makingCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "stoneCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "diamondCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchaseId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karigar_gold_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "karigarId" UUID NOT NULL,
    "purity" "GoldPurity" NOT NULL,
    "purpose" TEXT,
    "jobReference" TEXT,
    "givenWeight" DECIMAL(10,3) NOT NULL,
    "givenGoldRate" DECIMAL(14,2) NOT NULL,
    "givenLedgerEntryId" UUID NOT NULL,
    "expectedWeight" DECIMAL(10,3),
    "receivedWeight" DECIMAL(10,3),
    "receivedLedgerEntryId" UUID,
    "differenceWeight" DECIMAL(10,3),
    "toleranceGrams" DECIMAL(10,3),
    "reconciliationStatus" "JobReconciliationStatus",
    "classification" TEXT,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "karigar_gold_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_reconciliations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purity" "GoldPurity" NOT NULL,
    "systemWeight" DECIMAL(10,3) NOT NULL,
    "physicalWeight" DECIMAL(10,3) NOT NULL,
    "differenceWeight" DECIMAL(10,3) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gold_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_reconciliations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "systemAmount" DECIMAL(14,2) NOT NULL,
    "physicalAmount" DECIMAL(14,2) NOT NULL,
    "difference" DECIMAL(14,2) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "karigars_karigarCode_key" ON "karigars"("karigarCode");

-- CreateIndex
CREATE UNIQUE INDEX "karigars_phone_key" ON "karigars"("phone");

-- CreateIndex
CREATE INDEX "karigars_phone_idx" ON "karigars"("phone");

-- CreateIndex
CREATE INDEX "karigars_name_idx" ON "karigars"("name");

-- CreateIndex
CREATE INDEX "karigars_status_idx" ON "karigars"("status");

-- CreateIndex
CREATE INDEX "karigars_specialization_idx" ON "karigars"("specialization");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplierCode_key" ON "suppliers"("supplierCode");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_phone_key" ON "suppliers"("phone");

-- CreateIndex
CREATE INDEX "suppliers_phone_idx" ON "suppliers"("phone");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE INDEX "gold_ledger_entries_partyType_partyId_purity_createdAt_idx" ON "gold_ledger_entries"("partyType", "partyId", "purity", "createdAt");

-- CreateIndex
CREATE INDEX "gold_ledger_entries_referenceType_referenceId_idx" ON "gold_ledger_entries"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "party_gold_balances_partyType_partyId_purity_key" ON "party_gold_balances"("partyType", "partyId", "purity");

-- CreateIndex
CREATE INDEX "party_cash_ledger_entries_partyType_partyId_createdAt_idx" ON "party_cash_ledger_entries"("partyType", "partyId", "createdAt");

-- CreateIndex
CREATE INDEX "party_cash_ledger_entries_referenceType_referenceId_idx" ON "party_cash_ledger_entries"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "party_cash_balances_partyType_partyId_key" ON "party_cash_balances"("partyType", "partyId");

-- CreateIndex
CREATE INDEX "cash_transactions_transactionType_idx" ON "cash_transactions"("transactionType");

-- CreateIndex
CREATE INDEX "cash_transactions_paymentMethod_idx" ON "cash_transactions"("paymentMethod");

-- CreateIndex
CREATE INDEX "cash_transactions_createdAt_idx" ON "cash_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_sequence_key" ON "purchases"("sequence");

-- CreateIndex
CREATE INDEX "purchases_supplierId_idx" ON "purchases"("supplierId");

-- CreateIndex
CREATE INDEX "purchases_createdAt_idx" ON "purchases"("createdAt");

-- CreateIndex
CREATE INDEX "purchases_status_idx" ON "purchases"("status");

-- CreateIndex
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");

-- CreateIndex
CREATE INDEX "purchase_payments_purchaseId_idx" ON "purchase_payments"("purchaseId");

-- CreateIndex
CREATE INDEX "karigar_gold_jobs_karigarId_idx" ON "karigar_gold_jobs"("karigarId");

-- CreateIndex
CREATE INDEX "karigar_gold_jobs_reconciliationStatus_idx" ON "karigar_gold_jobs"("reconciliationStatus");

-- CreateIndex
CREATE INDEX "gold_reconciliations_purity_idx" ON "gold_reconciliations"("purity");

-- CreateIndex
CREATE INDEX "gold_reconciliations_createdAt_idx" ON "gold_reconciliations"("createdAt");

-- CreateIndex
CREATE INDEX "cash_reconciliations_createdAt_idx" ON "cash_reconciliations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_purchaseItemId_key" ON "inventory_items"("purchaseItemId");

-- CreateIndex
CREATE INDEX "inventory_items_source_idx" ON "inventory_items"("source");

-- CreateIndex
CREATE INDEX "inventory_items_supplierId_idx" ON "inventory_items"("supplierId");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karigars" ADD CONSTRAINT "karigars_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_ledger_entries" ADD CONSTRAINT "gold_ledger_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_cash_ledger_entries" ADD CONSTRAINT "party_cash_ledger_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karigar_gold_jobs" ADD CONSTRAINT "karigar_gold_jobs_karigarId_fkey" FOREIGN KEY ("karigarId") REFERENCES "karigars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karigar_gold_jobs" ADD CONSTRAINT "karigar_gold_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_reconciliations" ADD CONSTRAINT "gold_reconciliations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_reconciliations" ADD CONSTRAINT "cash_reconciliations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

