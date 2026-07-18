using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("Employees");
        builder.HasKey(e => e.EmployeeId);
        builder.Property(e => e.EmployeeCode).HasMaxLength(20).IsRequired();
        builder.Property(e => e.FullName).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Designation).HasMaxLength(100);
        builder.Property(e => e.Department).HasMaxLength(100);
        builder.Property(e => e.Phone).HasMaxLength(20);
        builder.Property(e => e.Email).HasMaxLength(100);
        builder.Property(e => e.Address).HasMaxLength(255);
        builder.Property(e => e.CNIC).HasMaxLength(20);
        builder.Property(e => e.Salary).HasColumnType("decimal(18,2)");
        builder.HasIndex(e => e.EmployeeCode).IsUnique();

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class KarigarConfiguration : IEntityTypeConfiguration<Karigar>
{
    public void Configure(EntityTypeBuilder<Karigar> builder)
    {
        builder.ToTable("Karigars");
        builder.HasKey(k => k.KarigarId);
        builder.Property(k => k.KarigarCode).HasMaxLength(20).IsRequired();
        builder.Property(k => k.FullName).HasMaxLength(100).IsRequired();
        builder.Property(k => k.Phone).HasMaxLength(20);
        builder.Property(k => k.Address).HasMaxLength(255);
        builder.Property(k => k.CNIC).HasMaxLength(20);
        builder.Property(k => k.SpecialtyType).HasMaxLength(100);
        builder.Property(k => k.OpeningGoldBalance).HasColumnType("decimal(18,3)");
        builder.Property(k => k.CurrentGoldBalance).HasColumnType("decimal(18,3)");
        builder.HasIndex(k => k.KarigarCode).IsUnique();
    }
}

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("Customers");
        builder.HasKey(c => c.CustomerId);
        builder.Property(c => c.CustomerCode).HasMaxLength(20).IsRequired();
        builder.Property(c => c.FullName).HasMaxLength(100).IsRequired();
        builder.Property(c => c.Phone).HasMaxLength(20);
        builder.Property(c => c.Email).HasMaxLength(100);
        builder.Property(c => c.Address).HasMaxLength(255);
        builder.Property(c => c.City).HasMaxLength(50);
        builder.Property(c => c.CNIC).HasMaxLength(20);
        builder.Property(c => c.CustomerType).HasMaxLength(20).IsRequired();
        builder.Property(c => c.OpeningBalance).HasColumnType("decimal(18,2)");
        builder.Property(c => c.CurrentBalance).HasColumnType("decimal(18,2)");
        builder.Property(c => c.CurrentGoldBalance).HasColumnType("decimal(18,3)");
        builder.Property(c => c.CreditLimit).HasColumnType("decimal(18,2)");
        builder.HasIndex(c => c.CustomerCode).IsUnique();
    }
}

public class SupplierConfiguration : IEntityTypeConfiguration<Supplier>
{
    public void Configure(EntityTypeBuilder<Supplier> builder)
    {
        builder.ToTable("Suppliers");
        builder.HasKey(s => s.SupplierId);
        builder.Property(s => s.SupplierCode).HasMaxLength(20).IsRequired();
        builder.Property(s => s.CompanyName).HasMaxLength(150).IsRequired();
        builder.Property(s => s.ContactPerson).HasMaxLength(100);
        builder.Property(s => s.Phone).HasMaxLength(20);
        builder.Property(s => s.Email).HasMaxLength(100);
        builder.Property(s => s.Address).HasMaxLength(255);
        builder.Property(s => s.City).HasMaxLength(50);
        builder.Property(s => s.OpeningBalance).HasColumnType("decimal(18,2)");
        builder.Property(s => s.CurrentBalance).HasColumnType("decimal(18,2)");
        builder.Property(s => s.CurrentGoldBalance).HasColumnType("decimal(18,3)");
        builder.HasIndex(s => s.SupplierCode).IsUnique();
    }
}
