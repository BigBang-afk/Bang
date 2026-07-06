using Microsoft.EntityFrameworkCore;
using TradingJournal.Core.Models;

namespace TradingJournal.Core.Data;

public class JournalDbContext : DbContext
{
    private readonly string _dbPath;

    public JournalDbContext(string dbPath)
    {
        _dbPath = dbPath;
    }

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();
    public DbSet<AppSettingsEntity> Settings => Set<AppSettingsEntity>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseSqlite($"Data Source={_dbPath}");
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LedgerEntry>()
            .HasOne(e => e.Customer)
            .WithMany(c => c.Entries)
            .HasForeignKey(e => e.CustomerId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<LedgerEntry>()
            .Property(e => e.AmountUsd)
            .HasColumnType("decimal(18,4)");

        modelBuilder.Entity<AppSettingsEntity>().HasData(new AppSettingsEntity
        {
            Id = 1,
            UsdToPkrRate = 280m,
            GoldRatePerUnit = 250000m,
            GoldUnitLabel = "Tola",
            UpdatedAt = new DateTime(2026, 1, 1)
        });
    }
}
