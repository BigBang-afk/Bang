using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Configurations;

public class BankAccountConfiguration : IEntityTypeConfiguration<BankAccount>
{
    public void Configure(EntityTypeBuilder<BankAccount> builder)
    {
        builder.ToTable("BankAccounts");
        builder.HasKey(b => b.BankAccountId);
        builder.Property(b => b.BankName).HasMaxLength(100).IsRequired();
        builder.Property(b => b.AccountTitle).HasMaxLength(150).IsRequired();
        builder.Property(b => b.AccountNumber).HasMaxLength(50).IsRequired();
        builder.Property(b => b.IBAN).HasMaxLength(50);
        builder.Property(b => b.Branch).HasMaxLength(100);
        builder.Property(b => b.OpeningBalance).HasColumnType("decimal(18,2)");
        builder.Property(b => b.CurrentBalance).HasColumnType("decimal(18,2)");
        builder.HasIndex(b => b.AccountNumber).IsUnique();
    }
}

public class CashLedgerEntryConfiguration : IEntityTypeConfiguration<CashLedgerEntry>
{
    public void Configure(EntityTypeBuilder<CashLedgerEntry> builder)
    {
        builder.ToTable("CashLedger");
        builder.HasKey(c => c.CashLedgerId);
        builder.Property(c => c.TransactionType).HasMaxLength(10).IsRequired();
        builder.Property(c => c.ReferenceType).HasMaxLength(30).IsRequired();
        builder.Property(c => c.Amount).HasColumnType("decimal(18,2)");
        builder.Property(c => c.PaymentMode).HasMaxLength(20).IsRequired();
        builder.Property(c => c.Description).HasMaxLength(255);
        builder.Property(c => c.RunningBalance).HasColumnType("decimal(18,2)");
        builder.Property(c => c.EntityType).HasMaxLength(20);
        builder.HasIndex(c => c.TransactionDate);
        builder.HasIndex(c => new { c.ReferenceType, c.ReferenceId });
        builder.HasIndex(c => new { c.EntityType, c.EntityId });

        builder.HasOne(c => c.BankAccount)
            .WithMany()
            .HasForeignKey(c => c.BankAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.CreatedByUser)
            .WithMany()
            .HasForeignKey(c => c.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class GoldLedgerEntryConfiguration : IEntityTypeConfiguration<GoldLedgerEntry>
{
    public void Configure(EntityTypeBuilder<GoldLedgerEntry> builder)
    {
        builder.ToTable("GoldLedger");
        builder.HasKey(g => g.GoldLedgerId);
        builder.Property(g => g.EntityType).HasMaxLength(20).IsRequired();
        builder.Property(g => g.TransactionType).HasMaxLength(10).IsRequired();
        builder.Property(g => g.Purity).HasMaxLength(10).IsRequired();
        builder.Property(g => g.Weight).HasColumnType("decimal(18,3)");
        builder.Property(g => g.ReferenceType).HasMaxLength(30);
        builder.Property(g => g.Description).HasMaxLength(255);
        builder.Property(g => g.RunningBalance).HasColumnType("decimal(18,3)");
        builder.HasIndex(g => new { g.EntityType, g.EntityId });
        builder.HasIndex(g => g.TransactionDate);

        builder.HasOne(g => g.CreatedByUser)
            .WithMany()
            .HasForeignKey(g => g.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> builder)
    {
        builder.ToTable("Expenses");
        builder.HasKey(e => e.ExpenseId);
        builder.Property(e => e.ExpenseCategory).HasMaxLength(50).IsRequired();
        builder.Property(e => e.Description).HasMaxLength(255);
        builder.Property(e => e.Amount).HasColumnType("decimal(18,2)");
        builder.Property(e => e.PaymentMode).HasMaxLength(20).IsRequired();
        builder.HasIndex(e => e.ExpenseDate);

        builder.HasOne(e => e.BankAccount).WithMany().HasForeignKey(e => e.BankAccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.ApprovedByUser).WithMany().HasForeignKey(e => e.ApprovedBy).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.CreatedByUser).WithMany().HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.Restrict);
    }
}

public class IncomeConfiguration : IEntityTypeConfiguration<Income>
{
    public void Configure(EntityTypeBuilder<Income> builder)
    {
        builder.ToTable("Income");
        builder.HasKey(i => i.IncomeId);
        builder.Property(i => i.IncomeCategory).HasMaxLength(50).IsRequired();
        builder.Property(i => i.Description).HasMaxLength(255);
        builder.Property(i => i.Amount).HasColumnType("decimal(18,2)");
        builder.Property(i => i.PaymentMode).HasMaxLength(20).IsRequired();
        builder.HasIndex(i => i.IncomeDate);

        builder.HasOne(i => i.BankAccount).WithMany().HasForeignKey(i => i.BankAccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(i => i.ReceivedByUser).WithMany().HasForeignKey(i => i.ReceivedBy).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(i => i.CreatedByUser).WithMany().HasForeignKey(i => i.CreatedBy).OnDelete(DeleteBehavior.Restrict);
    }
}
