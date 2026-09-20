using JxFinance.Domain.Investments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class SecurityConfiguration : IEntityTypeConfiguration<Security>
{
    public void Configure(EntityTypeBuilder<Security> builder)
    {
        builder.Property(s => s.Symbol).HasMaxLength(32);
        builder.Property(s => s.Name).HasMaxLength(200);
        builder.Property(s => s.Isin).HasMaxLength(12);
        builder.Property(s => s.Exchange).HasMaxLength(32);
        builder.Property(s => s.LastPrice).HasPrecision(18, 8);
        builder.HasIndex(s => new { s.Symbol, s.Currency }).IsUnique().HasFilter("\"IsDeleted\" = false");
        builder.HasIndex(s => s.BrokerContractId);
    }
}
