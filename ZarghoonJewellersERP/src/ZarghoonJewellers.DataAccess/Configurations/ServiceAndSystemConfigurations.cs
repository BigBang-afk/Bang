using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Configurations;

public class ShiftConfiguration : IEntityTypeConfiguration<Shift>
{
    public void Configure(EntityTypeBuilder<Shift> builder)
    {
        builder.ToTable("Shifts");
        builder.HasKey(s => s.ShiftId);
        builder.Property(s => s.OpeningCash).HasColumnType("decimal(18,2)");
        builder.Property(s => s.ClosingCashCounted).HasColumnType("decimal(18,2)");
        builder.Property(s => s.ExpectedCash).HasColumnType("decimal(18,2)");
        builder.Property(s => s.CashDifference).HasColumnType("decimal(18,2)");
        builder.Property(s => s.Status).HasMaxLength(10).IsRequired();
        builder.Property(s => s.Notes).HasMaxLength(500);
        builder.HasIndex(s => new { s.CashierUserId, s.Status });

        builder.HasOne(s => s.CashierUser)
            .WithMany()
            .HasForeignKey(s => s.CashierUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class RepairOrderConfiguration : IEntityTypeConfiguration<RepairOrder>
{
    public void Configure(EntityTypeBuilder<RepairOrder> builder)
    {
        builder.ToTable("RepairOrders");
        builder.HasKey(r => r.RepairOrderId);
        builder.Property(r => r.OrderNumber).HasMaxLength(30).IsRequired();
        builder.Property(r => r.ItemDescription).HasMaxLength(255).IsRequired();
        builder.Property(r => r.MetalType).HasMaxLength(20).IsRequired();
        builder.Property(r => r.Purity).HasMaxLength(10);
        builder.Property(r => r.Weight).HasColumnType("decimal(18,3)");
        builder.Property(r => r.RepairCharges).HasColumnType("decimal(18,2)");
        builder.Property(r => r.AdvancePaid).HasColumnType("decimal(18,2)");
        builder.Property(r => r.Status).HasMaxLength(20).IsRequired();
        builder.Property(r => r.Notes).HasMaxLength(500);
        builder.HasIndex(r => r.OrderNumber).IsUnique();
        builder.HasIndex(r => r.Status);

        builder.HasOne(r => r.Customer).WithMany(c => c.RepairOrders).HasForeignKey(r => r.CustomerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(r => r.Karigar).WithMany(k => k.RepairOrders).HasForeignKey(r => r.KarigarId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(r => r.CreatedByUser).WithMany().HasForeignKey(r => r.CreatedBy).OnDelete(DeleteBehavior.Restrict);
    }
}

public class SettingConfiguration : IEntityTypeConfiguration<Setting>
{
    public void Configure(EntityTypeBuilder<Setting> builder)
    {
        builder.ToTable("Settings");
        builder.HasKey(s => s.SettingId);
        builder.Property(s => s.SettingKey).HasMaxLength(100).IsRequired();
        builder.Property(s => s.SettingValue).HasMaxLength(500);
        builder.Property(s => s.Description).HasMaxLength(255);
        builder.HasIndex(s => s.SettingKey).IsUnique();

        builder.HasOne<Domain.Entities.User>().WithMany().HasForeignKey(s => s.ModifiedBy).OnDelete(DeleteBehavior.Restrict);
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");
        builder.HasKey(a => a.AuditLogId);
        builder.Property(a => a.ActionType).HasMaxLength(20).IsRequired();
        builder.Property(a => a.TableName).HasMaxLength(100);
        builder.Property(a => a.RecordId).HasMaxLength(50);
        builder.Property(a => a.IPAddress).HasMaxLength(50);
        builder.HasIndex(a => a.ActionDate);
        builder.HasIndex(a => a.UserId);

        builder.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class DailyGoldRateConfiguration : IEntityTypeConfiguration<DailyGoldRate>
{
    public void Configure(EntityTypeBuilder<DailyGoldRate> builder)
    {
        builder.ToTable("DailyGoldRates");
        builder.HasKey(g => g.GoldRateId);
        builder.Property(g => g.Rate24K).HasColumnType("decimal(18,2)");
        builder.Property(g => g.Rate22K).HasColumnType("decimal(18,2)");
        builder.Property(g => g.Rate21K).HasColumnType("decimal(18,2)");
        builder.Property(g => g.Rate18K).HasColumnType("decimal(18,2)");
        builder.Property(g => g.UsdPerOunce).HasColumnType("decimal(18,2)");
        builder.Property(g => g.UsdToPkr).HasColumnType("decimal(18,4)");
        builder.HasIndex(g => g.RateDate).IsUnique();

        builder.HasOne(g => g.EnteredByUser).WithMany().HasForeignKey(g => g.EnteredBy).OnDelete(DeleteBehavior.Restrict);
    }
}

public class UsdtTransactionConfiguration : IEntityTypeConfiguration<UsdtTransaction>
{
    public void Configure(EntityTypeBuilder<UsdtTransaction> builder)
    {
        builder.ToTable("UsdtTransactions");
        builder.HasKey(u => u.UsdtTransactionId);
        builder.Property(u => u.TransactionType).HasMaxLength(10).IsRequired();
        builder.Property(u => u.AmountUsdt).HasColumnType("decimal(18,6)");
        builder.Property(u => u.RateInPkr).HasColumnType("decimal(18,4)");

        builder.Property(u => u.TotalPkr)
            .HasColumnType("decimal(28,6)")
            .HasComputedColumnSql("([AmountUsdt]*[RateInPkr])", stored: true)
            .ValueGeneratedOnAddOrUpdate();

        builder.Property(u => u.WalletAddress).HasMaxLength(100);
        builder.Property(u => u.ReferenceNote).HasMaxLength(255);

        builder.HasOne(u => u.BankAccount).WithMany().HasForeignKey(u => u.BankAccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(u => u.CreatedByUser).WithMany().HasForeignKey(u => u.CreatedBy).OnDelete(DeleteBehavior.Restrict);
    }
}
