using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Configurations;

public class StockCategoryConfiguration : IEntityTypeConfiguration<StockCategory>
{
    public void Configure(EntityTypeBuilder<StockCategory> builder)
    {
        builder.ToTable("StockCategories");
        builder.HasKey(c => c.CategoryId);
        builder.Property(c => c.CategoryName).HasMaxLength(100).IsRequired();
        builder.Property(c => c.Description).HasMaxLength(255);
        builder.HasIndex(c => c.CategoryName).IsUnique();

        builder.HasOne(c => c.ParentCategory)
            .WithMany(c => c.ChildCategories)
            .HasForeignKey(c => c.ParentCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class StockConfiguration : IEntityTypeConfiguration<Stock>
{
    public void Configure(EntityTypeBuilder<Stock> builder)
    {
        builder.ToTable("Stock");
        builder.HasKey(s => s.StockId);
        builder.Property(s => s.ItemCode).HasMaxLength(30).IsRequired();
        builder.Property(s => s.ItemName).HasMaxLength(150).IsRequired();
        builder.Property(s => s.MetalType).HasMaxLength(20).IsRequired();
        builder.Property(s => s.Purity).HasMaxLength(10).IsRequired();
        builder.Property(s => s.GrossWeight).HasColumnType("decimal(18,3)");
        builder.Property(s => s.StoneWeight).HasColumnType("decimal(18,3)");

        // Database-computed persisted column: GrossWeight - StoneWeight.
        builder.Property(s => s.NetWeight)
            .HasColumnType("decimal(18,3)")
            .HasComputedColumnSql("([GrossWeight]-[StoneWeight])", stored: true)
            .ValueGeneratedOnAddOrUpdate();

        builder.Property(s => s.MakingChargeType).HasMaxLength(20).IsRequired();
        builder.Property(s => s.MakingChargeValue).HasColumnType("decimal(18,2)");
        builder.Property(s => s.StoneValue).HasColumnType("decimal(18,2)");
        builder.Property(s => s.UnitOfMeasure).HasMaxLength(10).IsRequired();
        builder.Property(s => s.PurchaseRate).HasColumnType("decimal(18,2)");
        builder.Property(s => s.PurchaseValue).HasColumnType("decimal(18,2)");
        builder.Property(s => s.SaleRate).HasColumnType("decimal(18,2)");
        builder.Property(s => s.MinimumStockLevel).HasColumnType("decimal(18,3)");
        builder.Property(s => s.VaultLocation).HasMaxLength(100);
        builder.HasIndex(s => s.ItemCode).IsUnique();
        builder.Ignore(s => s.IsLowStock);

        // ---- Identification ----
        builder.Property(s => s.DesignNumber).HasMaxLength(50);
        builder.Property(s => s.Brand).HasMaxLength(100);
        builder.Property(s => s.Collection).HasMaxLength(100);
        builder.Property(s => s.Occasion).HasMaxLength(50);
        builder.Property(s => s.Gender).HasMaxLength(20).IsRequired();
        builder.Property(s => s.HallmarkNumber).HasMaxLength(50);
        builder.Property(s => s.SerialNumber).HasMaxLength(50);
        builder.Property(s => s.BatchNumber).HasMaxLength(50);
        builder.Property(s => s.ShelfNumber).HasMaxLength(50);
        builder.HasIndex(s => s.SerialNumber).IsUnique().HasFilter("[SerialNumber] IS NOT NULL");
        builder.HasIndex(s => s.HallmarkNumber);
        builder.HasIndex(s => s.BatchNumber);
        builder.HasIndex(s => s.DesignNumber);
        builder.HasIndex(s => s.Brand);
        builder.HasIndex(s => s.Collection);
        builder.HasIndex(s => s.ItemStatus);

        // ---- Costing ----
        builder.Property(s => s.LaborCharges).HasColumnType("decimal(18,2)");
        builder.Property(s => s.LossPercentage).HasColumnType("decimal(5,2)");

        // Database-computed persisted column: purity- and loss-adjusted fine gold weight.
        builder.Property(s => s.FineGoldWeight)
            .HasColumnType("decimal(18,3)")
            .HasComputedColumnSql(
                "(CASE [Purity] " +
                "WHEN '24K' THEN [NetWeight] " +
                "WHEN '22K' THEN [NetWeight]*0.9166 " +
                "WHEN '21K' THEN [NetWeight]*0.8750 " +
                "WHEN '18K' THEN [NetWeight]*0.7500 " +
                "ELSE [NetWeight]*0.9166 END) * (1+[LossPercentage]/100.0)",
                stored: true)
            .ValueGeneratedOnAddOrUpdate();

        builder.Property(s => s.ItemStatus).HasMaxLength(20).IsRequired();

        builder.HasOne(s => s.Category)
            .WithMany(c => c.StockItems)
            .HasForeignKey(s => s.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Karigar)
            .WithMany(k => k.StockItems)
            .HasForeignKey(s => s.KarigarId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Supplier)
            .WithMany(sup => sup.StockItems)
            .HasForeignKey(s => s.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class BarcodeConfiguration : IEntityTypeConfiguration<Barcode>
{
    public void Configure(EntityTypeBuilder<Barcode> builder)
    {
        builder.ToTable("Barcodes");
        builder.HasKey(b => b.BarcodeId);
        builder.Property(b => b.BarcodeValue).HasMaxLength(50).IsRequired();
        builder.Property(b => b.BarcodeType).HasMaxLength(20).IsRequired();
        builder.HasIndex(b => b.BarcodeValue).IsUnique();

        builder.HasOne(b => b.Stock)
            .WithMany(s => s.Barcodes)
            .HasForeignKey(b => b.StockId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ImageAssetConfiguration : IEntityTypeConfiguration<ImageAsset>
{
    public void Configure(EntityTypeBuilder<ImageAsset> builder)
    {
        builder.ToTable("Images");
        builder.HasKey(i => i.ImageId);
        builder.Property(i => i.EntityType).HasMaxLength(30).IsRequired();
        builder.Property(i => i.FileName).HasMaxLength(260).IsRequired();
        builder.Property(i => i.FilePath).HasMaxLength(500);
        builder.HasIndex(i => new { i.EntityType, i.EntityId });
    }
}
