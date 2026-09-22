using JxFinance.Domain.NetWorth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class NetWorthSnapshotConfiguration : IEntityTypeConfiguration<NetWorthSnapshot>
{
    public void Configure(EntityTypeBuilder<NetWorthSnapshot> builder)
    {
        builder.Property(s => s.Accounts).HasPrecision(18, 2);
        builder.Property(s => s.Assets).HasPrecision(18, 2);
        builder.Property(s => s.Debts).HasPrecision(18, 2);
        builder.Property(s => s.NetWorthValue).HasPrecision(18, 2);
        builder.HasIndex(s => new { s.UserId, s.Date }).IsUnique();
    }
}
