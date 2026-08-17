-- CreateEnum
CREATE TYPE "WastageType" AS ENUM ('PERCENTAGE', 'FIXED_GRAMS');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'RESERVED', 'SOLD', 'RETURNED', 'DAMAGED', 'LOST');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('STOCK_CREATED', 'STOCK_UPDATED', 'STOCK_RESERVED', 'STOCK_SOLD', 'STOCK_RETURNED', 'STOCK_ADJUSTED', 'STOCK_DAMAGED', 'STOCK_LOST', 'STOCK_ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CATEGORY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCIAL_FIELDS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'BARCODE_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'BARCODE_PRINTED';

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "subcategory" TEXT,
    "designNumber" TEXT,
    "supplier" TEXT,
    "karigar" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "purity" "GoldPurity" NOT NULL,
    "netWeight" DECIMAL(10,3) NOT NULL,
    "wastageType" "WastageType" NOT NULL,
    "wastagePercent" DECIMAL(6,3),
    "wastageWeight" DECIMAL(10,3) NOT NULL,
    "grossWeight" DECIMAL(10,3) NOT NULL,
    "goldRatePerGram" DECIMAL(14,2) NOT NULL,
    "goldRateSourceId" UUID,
    "goldValue" DECIMAL(14,2) NOT NULL,
    "makingCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "stoneCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "diamondCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(14,2) NOT NULL,
    "sellingPrice" DECIMAL(14,2) NOT NULL,
    "expectedProfit" DECIMAL(14,2) NOT NULL,
    "profitMarginPercent" DECIMAL(7,2) NOT NULL,
    "status" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "archivedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sequence" SERIAL NOT NULL,
    "inventoryItemId" UUID NOT NULL,
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "lastPrintedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventoryItemId" UUID NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "previousStatus" "StockStatus",
    "newStatus" "StockStatus",
    "weight" DECIMAL(10,3),
    "notes" TEXT,
    "metadata" JSONB,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_designNumber_idx" ON "products"("designNumber");

-- CreateIndex
CREATE INDEX "products_supplier_idx" ON "products"("supplier");

-- CreateIndex
CREATE INDEX "products_karigar_idx" ON "products"("karigar");

-- CreateIndex
CREATE INDEX "inventory_items_productId_idx" ON "inventory_items"("productId");

-- CreateIndex
CREATE INDEX "inventory_items_status_idx" ON "inventory_items"("status");

-- CreateIndex
CREATE INDEX "inventory_items_createdAt_idx" ON "inventory_items"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_items_archivedAt_idx" ON "inventory_items"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "barcodes_sequence_key" ON "barcodes"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "barcodes_inventoryItemId_key" ON "barcodes"("inventoryItemId");

-- CreateIndex
CREATE INDEX "stock_movements_inventoryItemId_idx" ON "stock_movements"("inventoryItemId");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_goldRateSourceId_fkey" FOREIGN KEY ("goldRateSourceId") REFERENCES "gold_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
