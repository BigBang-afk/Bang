using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class ApplicationLogConfiguration : IEntityTypeConfiguration<ApplicationLog>
{
    public void Configure(EntityTypeBuilder<ApplicationLog> builder)
    {
        builder.ToTable("ApplicationLogs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Level).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Message).IsRequired();
        builder.HasIndex(x => x.TimestampUtc);
    }
}
