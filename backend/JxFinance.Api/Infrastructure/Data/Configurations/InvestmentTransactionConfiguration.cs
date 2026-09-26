using JxFinance.Domain.Investments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class InvestmentTransactionConfiguration : IEntityTypeConfiguration<InvestmentTransaction>
{
    public void Configure(EntityTypeBuilder<InvestmentTransaction> builder)
    {
        builder.ComplexProperty(t => t.CashAmount, money => money.HasColumns("CashAmount", DbSchema.CurrencyColumn));
        builder.Property(t => t.Quantity).HasPrecision(20, 8);
        builder.Property(t => t.Price).HasPrecision(20, 8);
        builder.Property(t => t.Description).HasMaxLength(500);
        builder.Property(t => t.ExternalId).HasMaxLength(64);
        builder.HasIndex(t => new { t.AccountId, t.Date });
        builder.HasIndex(t => new { t.AccountId, t.ExternalId }).IsUnique();
    }
}
