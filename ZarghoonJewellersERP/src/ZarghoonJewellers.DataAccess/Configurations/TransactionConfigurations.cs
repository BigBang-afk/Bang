using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Configurations;

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("Invoices");
        builder.HasKey(i => i.InvoiceId);
        builder.Property(i => i.InvoiceNumber).HasMaxLength(30).IsRequired();
        builder.Property(i => i.GoldRateAtSale).HasColumnType("decimal(18,2)");
        builder.Property(i => i.TotalGrossWeight).HasColumnType("decimal(18,3)");
        builder.Property(i => i.TotalNetWeight).HasColumnType("decimal(18,3)");
        builder.Property(i => i.SubTotal).HasColumnType("decimal(18,2)");
        builder.Property(i => i.MakingChargeTotal).HasColumnType("decimal(18,2)");
        builder.Property(i => i.DiscountPercentage).HasColumnType("decimal(5,2)");
        builder.Property(i => i.DiscountAmount).HasColumnType("decimal(18,2)");
        builder.Property(i => i.TaxPercentage).HasColumnType("decimal(5,2)");
        builder.Property(i => i.TaxAmount).HasColumnType("decimal(18,2)");
        builder.Property(i => i.TotalAmount).HasColumnType("decimal(18,2)");
        builder.Property(i => i.PaidAmount).HasColumnType("decimal(18,2)");

        builder.Property(i => i.BalanceAmount)
            .HasColumnType("decimal(18,2)")
            .HasComputedColumnSql("([TotalAmount]-[PaidAmount])", stored: true)
            .ValueGeneratedOnAddOrUpdate();

        builder.Property(i => i.PaymentMode).HasMaxLength(20).IsRequired();
        builder.Property(i => i.OldGoldExchangeWeight).HasColumnType("decimal(18,3)");
        builder.Property(i => i.Status).HasMaxLength(20).IsRequired();
        builder.Property(i => i.InvoiceType).HasMaxLength(20).IsRequired();
        builder.Property(i => i.HoldLabel).HasMaxLength(100);
        builder.HasIndex(i => i.InvoiceNumber).IsUnique();
        builder.HasIndex(i => i.InvoiceDate);
        builder.HasIndex(i => i.ShiftId);
        builder.HasIndex(i => i.InvoiceType);

        builder.HasOne(i => i.Customer)
            .WithMany(c => c.Invoices)
            .HasForeignKey(i => i.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.CreatedByUser)
            .WithMany()
            .HasForeignKey(i => i.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Shift)
            .WithMany(s => s.Invoices)
            .HasForeignKey(i => i.ShiftId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.OriginalInvoice)
            .WithMany()
            .HasForeignKey(i => i.OriginalInvoiceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class InvoicePaymentConfiguration : IEntityTypeConfiguration<InvoicePayment>
{
    public void Configure(EntityTypeBuilder<InvoicePayment> builder)
    {
        builder.ToTable("InvoicePayments");
        builder.HasKey(p => p.InvoicePaymentId);
        builder.Property(p => p.PaymentMethod).HasMaxLength(20).IsRequired();
        builder.Property(p => p.Amount).HasColumnType("decimal(18,2)");
        builder.Property(p => p.ReferenceNumber).HasMaxLength(100);
        builder.HasIndex(p => p.InvoiceId);

        builder.HasOne(p => p.Invoice)
            .WithMany(i => i.Payments)
            .HasForeignKey(p => p.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(p => p.BankAccount)
            .WithMany()
            .HasForeignKey(p => p.BankAccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class InvoiceDetailConfiguration : IEntityTypeConfiguration<InvoiceDetail>
{
    public void Configure(EntityTypeBuilder<InvoiceDetail> builder)
    {
        builder.ToTable("InvoiceDetails");
        builder.HasKey(d => d.InvoiceDetailId);
        builder.Property(d => d.Purity).HasMaxLength(10).IsRequired();
        builder.Property(d => d.GrossWeight).HasColumnType("decimal(18,3)");
        builder.Property(d => d.StoneWeight).HasColumnType("decimal(18,3)");

        builder.Property(d => d.NetWeight)
            .HasColumnType("decimal(18,3)")
            .HasComputedColumnSql("([GrossWeight]-[StoneWeight])", stored: true)
            .ValueGeneratedOnAddOrUpdate();

        builder.Property(d => d.Rate).HasColumnType("decimal(18,2)");
        builder.Property(d => d.MakingCharge).HasColumnType("decimal(18,2)");
        builder.Property(d => d.StoneValue).HasColumnType("decimal(18,2)");
        builder.Property(d => d.LineTotal).HasColumnType("decimal(18,2)");

        builder.HasOne(d => d.Invoice)
            .WithMany(i => i.InvoiceDetails)
            .HasForeignKey(d => d.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(d => d.Stock)
            .WithMany(s => s.InvoiceDetails)
            .HasForeignKey(d => d.StockId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class PurchaseConfiguration : IEntityTypeConfiguration<Purchase>
{
    public void Configure(EntityTypeBuilder<Purchase> builder)
    {
        builder.ToTable("Purchases");
        builder.HasKey(p => p.PurchaseId);
        builder.Property(p => p.PurchaseNumber).HasMaxLength(30).IsRequired();
        builder.Property(p => p.GoldRateAtPurchase).HasColumnType("decimal(18,2)");
        builder.Property(p => p.TotalGrossWeight).HasColumnType("decimal(18,3)");
        builder.Property(p => p.TotalNetWeight).HasColumnType("decimal(18,3)");
        builder.Property(p => p.SubTotal).HasColumnType("decimal(18,2)");
        builder.Property(p => p.TotalAmount).HasColumnType("decimal(18,2)");
        builder.Property(p => p.PaidAmount).HasColumnType("decimal(18,2)");

        builder.Property(p => p.BalanceAmount)
            .HasColumnType("decimal(18,2)")
            .HasComputedColumnSql("([TotalAmount]-[PaidAmount])", stored: true)
            .ValueGeneratedOnAddOrUpdate();

        builder.Property(p => p.Status).HasMaxLength(20).IsRequired();
        builder.HasIndex(p => p.PurchaseNumber).IsUnique();
        builder.HasIndex(p => p.PurchaseDate);

        builder.HasOne(p => p.Supplier)
            .WithMany(s => s.Purchases)
            .HasForeignKey(p => p.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.CreatedByUser)
            .WithMany()
            .HasForeignKey(p => p.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class PurchaseDetailConfiguration : IEntityTypeConfiguration<PurchaseDetail>
{
    public void Configure(EntityTypeBuilder<PurchaseDetail> builder)
    {
        builder.ToTable("PurchaseDetails");
        builder.HasKey(d => d.PurchaseDetailId);
        builder.Property(d => d.ItemName).HasMaxLength(150).IsRequired();
        builder.Property(d => d.Purity).HasMaxLength(10).IsRequired();
        builder.Property(d => d.GrossWeight).HasColumnType("decimal(18,3)");
        builder.Property(d => d.StoneWeight).HasColumnType("decimal(18,3)");

        builder.Property(d => d.NetWeight)
            .HasColumnType("decimal(18,3)")
            .HasComputedColumnSql("([GrossWeight]-[StoneWeight])", stored: true)
            .ValueGeneratedOnAddOrUpdate();

        builder.Property(d => d.Rate).HasColumnType("decimal(18,2)");
        builder.Property(d => d.Amount).HasColumnType("decimal(18,2)");

        builder.HasOne(d => d.Purchase)
            .WithMany(p => p.PurchaseDetails)
            .HasForeignKey(d => d.PurchaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(d => d.Stock)
            .WithMany(s => s.PurchaseDetails)
            .HasForeignKey(d => d.StockId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
