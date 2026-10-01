using JxFinance.Domain.ExchangeRates;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class ManualExchangeRateConfiguration : IEntityTypeConfiguration<ManualExchangeRate>
{
    public void Configure(EntityTypeBuilder<ManualExchangeRate> builder)
    {
        builder.HasKey(r => new { r.Date, r.Currency });
        builder.Property(r => r.Rate).HasPrecision(18, 8);
    }
}
