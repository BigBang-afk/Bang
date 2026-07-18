/* ============================================================================
   Zarghoon Jewellers ERP
   Script : 05_StockModuleEnhancements.sql
   Purpose: Extends erp.Stock with the fields needed by the full Stock
            Management module (identification, classification, costing and
            lifecycle status), plus the supporting indexes for fast search/
            filter/sort/group in the Quick Stock Entry and Inventory grids.

            Additive only - safe to run against a database created by
            01-04. SubCategory reuses the existing self-referencing
            erp.StockCategories hierarchy (ParentCategoryId) rather than a
            new table, so a "sub category" is simply a category whose
            ParentCategoryId points at another category.
   ========================================================================= */

USE ZarghoonJewellersDB;
GO

/* ---------------------------------------------------------- Identification
   Gender is NOT NULL with a DEFAULT (rather than nullable) specifically so that if this
   script runs against a database that already has Stock rows (from an earlier session),
   SQL Server backfills every existing row with 'Unisex' as part of the ALTER TABLE - a
   nullable column here would leave old rows as NULL, which EF Core's non-nullable
   Stock.Gender string property cannot materialize without throwing. */
ALTER TABLE erp.Stock ADD
    DesignNumber    NVARCHAR(50)    NULL,
    Brand           NVARCHAR(100)   NULL,
    Collection      NVARCHAR(100)   NULL,
    Occasion        NVARCHAR(50)    NULL,
    Gender          NVARCHAR(20)    NOT NULL CONSTRAINT DF_Stock_Gender DEFAULT ('Unisex'),
    HallmarkNumber  NVARCHAR(50)    NULL,
    SerialNumber    NVARCHAR(50)    NULL,
    BatchNumber     NVARCHAR(50)    NULL,
    ShelfNumber     NVARCHAR(50)    NULL;
GO

/* -------------------------------------------------------------- Costing */
ALTER TABLE erp.Stock ADD
    LaborCharges    DECIMAL(18,2)   NOT NULL CONSTRAINT DF_Stock_LaborCharges DEFAULT (0),
    LossPercentage  DECIMAL(5,2)    NOT NULL CONSTRAINT DF_Stock_LossPercentage DEFAULT (0);
GO

/* Fine gold weight = NetWeight adjusted for purity (24K=1.0, 22K=0.916,
   21K=0.875, 18K=0.75) and for the manufacturing loss/wastage percentage.
   Computed + persisted so search/report queries never need to recompute it. */
ALTER TABLE erp.Stock ADD FineGoldWeight AS (
    CASE Purity
        WHEN '24K' THEN [NetWeight]
        WHEN '22K' THEN [NetWeight] * 0.9166
        WHEN '21K' THEN [NetWeight] * 0.8750
        WHEN '18K' THEN [NetWeight] * 0.7500
        ELSE [NetWeight] * 0.9166
    END * (1 + [LossPercentage] / 100.0)
) PERSISTED;
GO

/* ------------------------------------------------------------- Lifecycle
   ItemStatus tracks the jewelry-specific workflow (Active/Sold/Reserved/
   Repair/Melted/Returned) independently of IsActive, which continues to
   mean "not soft-deleted" so existing low-stock/value queries are untouched. */
ALTER TABLE erp.Stock ADD
    ItemStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_Stock_ItemStatus DEFAULT ('Active');
GO

ALTER TABLE erp.Stock ADD CONSTRAINT CK_Stock_ItemStatus
    CHECK (ItemStatus IN ('Active','Sold','Reserved','Repair','Melted','Returned'));
GO

ALTER TABLE erp.Stock ADD CONSTRAINT CK_Stock_Gender
    CHECK (Gender IN ('Men','Women','Kids','Unisex'));
GO

/* ---------------------------------------------------------------- Indexes */
CREATE UNIQUE NONCLUSTERED INDEX UQ_Stock_SerialNumber ON erp.Stock (SerialNumber)
    WHERE SerialNumber IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_Stock_HallmarkNumber ON erp.Stock (HallmarkNumber);
CREATE NONCLUSTERED INDEX IX_Stock_BatchNumber ON erp.Stock (BatchNumber);
CREATE NONCLUSTERED INDEX IX_Stock_DesignNumber ON erp.Stock (DesignNumber);
CREATE NONCLUSTERED INDEX IX_Stock_Brand ON erp.Stock (Brand);
CREATE NONCLUSTERED INDEX IX_Stock_Collection ON erp.Stock (Collection);
CREATE NONCLUSTERED INDEX IX_Stock_ItemStatus ON erp.Stock (ItemStatus);
CREATE NONCLUSTERED INDEX IX_Stock_ItemName_Search ON erp.Stock (ItemName) INCLUDE (ItemCode, DesignNumber, Brand);
GO
