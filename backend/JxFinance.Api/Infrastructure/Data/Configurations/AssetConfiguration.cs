using JxFinance.Domain.NetWorth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class AssetConfiguration : IEntityTypeConfiguration<Asset>
{
    public void Configure(EntityTypeBuilder<Asset> builder)
    {
        builder.Property(a => a.Name).HasMaxLength(100);
        builder.ComplexProperty(a => a.CurrentValue, money => money.HasColumns("CurrentValue", DbSchema.CurrencyColumn));
        builder.Ignore(a => a.Currency);
        builder.HasIndex(a => a.UserId);
    }
}
