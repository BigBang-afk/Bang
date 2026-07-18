/* ============================================================================
   Zarghoon Jewellers ERP
   Script : 01_CreateDatabase.sql
   Purpose: Creates the primary database with sensible defaults for a
            single-store / single-branch jewelry ERP running on
            SQL Server Express.
   Run as : sysadmin / db_creator on the target SQL Server instance.
   ========================================================================= */

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'ZarghoonJewellersDB')
BEGIN
    CREATE DATABASE ZarghoonJewellersDB
    COLLATE SQL_Latin1_General_CP1_CI_AS;
END
GO

ALTER DATABASE ZarghoonJewellersDB SET RECOVERY SIMPLE;
GO

USE ZarghoonJewellersDB;
GO

/* Dedicated schema keeps the ERP objects isolated from the built-in dbo
   objects and makes future multi-module extensions (e.g. Reporting) easier
   to namespace without collisions. */
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'erp')
BEGIN
    EXEC('CREATE SCHEMA erp AUTHORIZATION dbo');
END
GO
