/* ============================================================================
   Zarghoon Jewellers ERP
   Script : 06_SalesPosEnhancements.sql
   Purpose: Extends the schema for the full commercial POS / Sales module:
            split/multi-method payments, held invoices, returns & exchanges
            (reusing Invoices/InvoiceDetails rather than a parallel table),
            cashier shifts for daily/shift closing, wider payment method
            support (Card/JazzCash/EasyPaisa/USDT), and an EntityType/EntityId
            tag on CashLedger so Customer/Supplier/Karigar cash ledgers can be
            read straight out of the existing ledger table.

            Additive only - safe to run against a database created by 01-05.
   ========================================================================= */

USE ZarghoonJewellersDB;
GO

/* ------------------------------------------------------------- Shifts
   One row per cashier session. ExpectedCash/CashDifference are filled in at
   close time by ShiftService, computed from the CashLedger movements posted
   while the shift was open - not stored redundantly anywhere else. */
CREATE TABLE erp.Shifts
(
    ShiftId             INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Shifts PRIMARY KEY,
    CashierUserId       INT                 NOT NULL,
    OpenedAt            DATETIME2(0)        NOT NULL CONSTRAINT DF_Shifts_OpenedAt DEFAULT (SYSDATETIME()),
    ClosedAt            DATETIME2(0)        NULL,
    OpeningCash         DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Shifts_OpeningCash DEFAULT (0),
    ClosingCashCounted  DECIMAL(18,2)       NULL,
    ExpectedCash        DECIMAL(18,2)       NULL,
    CashDifference      DECIMAL(18,2)       NULL,
    Status              NVARCHAR(10)        NOT NULL CONSTRAINT DF_Shifts_Status DEFAULT ('Open'),
    Notes               NVARCHAR(500)       NULL,
    CreatedDate         DATETIME2(0)        NOT NULL CONSTRAINT DF_Shifts_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_Shifts_Users FOREIGN KEY (CashierUserId) REFERENCES erp.Users (UserId),
    CONSTRAINT CK_Shifts_Status CHECK (Status IN ('Open','Closed'))
);
GO
CREATE NONCLUSTERED INDEX IX_Shifts_CashierUserId_Status ON erp.Shifts (CashierUserId, Status);
GO

/* ------------------------------------------------------- Invoice extensions
   ShiftId ties a sale to the cashier session it happened under (nullable -
   older rows and non-POS invoices may not have one). OriginalInvoiceId lets
   a Return/Exchange invoice point back at the sale it is reversing/adjusting,
   so returns are just another Invoice row (InvoiceType='Return') instead of
   a parallel table duplicating the line-item structure. */
ALTER TABLE erp.Invoices ADD
    DiscountPercentage  DECIMAL(5,2)    NOT NULL CONSTRAINT DF_Invoices_DiscountPercentage DEFAULT (0),
    TaxPercentage       DECIMAL(5,2)    NOT NULL CONSTRAINT DF_Invoices_TaxPercentage DEFAULT (0),
    ShiftId             INT             NULL,
    HoldLabel           NVARCHAR(100)   NULL,
    InvoiceType         NVARCHAR(20)    NOT NULL CONSTRAINT DF_Invoices_InvoiceType DEFAULT ('Sale'),
    OriginalInvoiceId   INT             NULL;
GO

ALTER TABLE erp.Invoices ADD CONSTRAINT FK_Invoices_Shifts FOREIGN KEY (ShiftId) REFERENCES erp.Shifts (ShiftId);
ALTER TABLE erp.Invoices ADD CONSTRAINT FK_Invoices_OriginalInvoice FOREIGN KEY (OriginalInvoiceId) REFERENCES erp.Invoices (InvoiceId);
ALTER TABLE erp.Invoices ADD CONSTRAINT CK_Invoices_InvoiceType CHECK (InvoiceType IN ('Sale','Return','Exchange'));
GO

-- Widen the allowed Status/PaymentMode values (Held for hold-invoice, and the
-- full payment method list needed by split payments).
ALTER TABLE erp.Invoices DROP CONSTRAINT CK_Invoices_Status;
ALTER TABLE erp.Invoices ADD CONSTRAINT CK_Invoices_Status
    CHECK (Status IN ('Draft','Held','Confirmed','Cancelled','Returned'));
GO

ALTER TABLE erp.Invoices DROP CONSTRAINT CK_Invoices_PaymentMode;
ALTER TABLE erp.Invoices ADD CONSTRAINT CK_Invoices_PaymentMode
    CHECK (PaymentMode IN ('Cash','Bank','Card','JazzCash','EasyPaisa','USDT','Credit','Split'));
GO

CREATE NONCLUSTERED INDEX IX_Invoices_ShiftId ON erp.Invoices (ShiftId);
CREATE NONCLUSTERED INDEX IX_Invoices_OriginalInvoiceId ON erp.Invoices (OriginalInvoiceId);
CREATE NONCLUSTERED INDEX IX_Invoices_InvoiceType ON erp.Invoices (InvoiceType);
CREATE NONCLUSTERED INDEX IX_Invoices_Status_Held ON erp.Invoices (Status) WHERE Status = 'Held';
GO

/* ------------------------------------------------------- Split payments
   One invoice can be settled across several methods (e.g. half Cash, half
   Card) - each line here is one payment method's contribution to the total. */
CREATE TABLE erp.InvoicePayments
(
    InvoicePaymentId    INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_InvoicePayments PRIMARY KEY,
    InvoiceId           INT                 NOT NULL,
    PaymentMethod       NVARCHAR(20)        NOT NULL,
    Amount              DECIMAL(18,2)       NOT NULL,
    ReferenceNumber     NVARCHAR(100)       NULL,
    BankAccountId       INT                 NULL,
    CreatedDate         DATETIME2(0)        NOT NULL CONSTRAINT DF_InvoicePayments_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_InvoicePayments_Invoices FOREIGN KEY (InvoiceId) REFERENCES erp.Invoices (InvoiceId) ON DELETE CASCADE,
    CONSTRAINT FK_InvoicePayments_BankAccounts FOREIGN KEY (BankAccountId) REFERENCES erp.BankAccounts (BankAccountId),
    CONSTRAINT CK_InvoicePayments_PaymentMethod CHECK (PaymentMethod IN ('Cash','Bank','Card','JazzCash','EasyPaisa','USDT'))
);
GO
CREATE NONCLUSTERED INDEX IX_InvoicePayments_InvoiceId ON erp.InvoicePayments (InvoiceId);
GO

/* -------------------------------------------------- CashLedger extensions
   Tags each cash movement with the entity it belongs to (Customer/Supplier/
   Karigar), the same polymorphic pattern GoldLedger already uses, so the
   Customer/Supplier/Karigar Ledger screens can read directly from this one
   table instead of needing bespoke per-entity cash tables. */
ALTER TABLE erp.CashLedger ADD
    EntityType  NVARCHAR(20)    NULL,
    EntityId    INT             NULL;
GO

ALTER TABLE erp.CashLedger DROP CONSTRAINT CK_CashLedger_PaymentMode;
ALTER TABLE erp.CashLedger ADD CONSTRAINT CK_CashLedger_PaymentMode
    CHECK (PaymentMode IN ('Cash','Bank','Card','JazzCash','EasyPaisa','USDT','Cheque'));
GO

CREATE NONCLUSTERED INDEX IX_CashLedger_EntityType_EntityId ON erp.CashLedger (EntityType, EntityId);
GO

/* ------------------------------------------------------------- Settings
   POS/notification configuration - populated with sensible blanks; the
   Settings screen (or direct SQL) is where a shop fills in its real SMTP/
   SMS/WhatsApp gateway credentials before those notification features can
   actually send anything. */
INSERT INTO erp.Settings (SettingKey, SettingValue, Description)
SELECT v.[Key], v.[Value], v.[Description]
FROM (VALUES
    ('TaxRegistrationNumber', '',      'GST/VAT registration number printed on invoices'),
    ('DefaultTaxPercentage',  '0',     'Default GST/VAT % pre-filled on new invoices'),
    ('ThermalPrinterWidth',   '80',    'Thermal receipt width in mm (58 or 80)'),
    ('SmtpHost',              '',      'SMTP server host for Email Invoice'),
    ('SmtpPort',              '587',   'SMTP server port'),
    ('SmtpUsername',          '',      'SMTP account username'),
    ('SmtpPassword',          '',      'SMTP account password (store securely in production)'),
    ('SmtpUseSsl',            'true',  'Whether to use SSL/TLS for SMTP'),
    ('SmtpFromAddress',       '',      'From address used when emailing invoices'),
    ('SmsGatewayUrl',         '',      'HTTP endpoint for the configured SMS gateway'),
    ('SmsGatewayApiKey',      '',      'API key/token for the SMS gateway'),
    ('WhatsAppGatewayUrl',    '',      'HTTP endpoint for the configured WhatsApp Business API/gateway'),
    ('WhatsAppGatewayApiKey', '',      'API key/token for the WhatsApp gateway')
) AS v([Key], [Value], [Description])
WHERE NOT EXISTS (SELECT 1 FROM erp.Settings s WHERE s.SettingKey = v.[Key]);
GO
