using JxFinance.Domain.Investments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class SecurityConfiguration : IEntityTypeConfiguration<Security>
{
    public void Configure(EntityTypeBuilder<Security> builder)
    {
        builder.Property(s => s.Symbol).HasMaxLength(Security.SymbolMaxLength);
        builder.Property(s => s.Name).HasMaxLength(Security.NameMaxLength);
        builder.Property(s => s.Isin).HasMaxLength(12);
        builder.Property(s => s.Exchange).HasMaxLength(Security.ExchangeMaxLength);
        builder.Property(s => s.LastPrice).HasPrecision(18, 8);
        builder.Property(s => s.PriceSource).HasConversion<string>().HasMaxLength(20).HasDefaultValue(PriceSource.None);
        builder.Property(s => s.PriceSymbol).HasMaxLength(Security.PriceSymbolMaxLength);
        builder.Property(s => s.PriceQuoteCurrency).HasMaxLength(Security.PriceQuoteCurrencyLength);
        builder.Property(s => s.PriceSyncError).HasMaxLength(Security.PriceSyncErrorMaxLength);
        builder.ToTable(table => table.HasCheckConstraint(
            "CK_Securities_PriceSymbol",
            """
            "PriceSource" = 'None' OR "PriceSymbol" IS NOT NULL
            """));
        builder.HasIndex(s => new { s.Symbol, s.Currency }).IsUnique().HasFilter(DbSchema.NotDeletedFilter);
        builder.HasIndex(s => s.BrokerContractId);
    }
}
