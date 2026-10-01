using JxFinance.Domain.Investments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class AllocationTargetConfiguration : IEntityTypeConfiguration<AllocationTarget>
{
    public void Configure(EntityTypeBuilder<AllocationTarget> builder)
    {
        builder.Property(t => t.Dimension).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.Key).HasMaxLength(AllocationTarget.KeyMaxLength);
        builder.Property(t => t.Share).HasPrecision(5, 2);
        builder.HasIndex(t => new { t.UserId, t.Key })
            .IsUnique()
            .HasFilter(DbSchema.NotDeletedFilter);
    }
}
