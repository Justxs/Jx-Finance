using JxFinance.Domain.Transfers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class TransferConfiguration : IEntityTypeConfiguration<Transfer>
{
    public void Configure(EntityTypeBuilder<Transfer> builder)
    {
        builder.ComplexProperty(t => t.Amount, money => money.HasColumns("Amount", DbSchema.CurrencyColumn));
        builder.ComplexProperty(t => t.ReceivedAmount, money => money.HasColumns("ReceivedAmount", "ReceivedCurrency"));
        builder.Property(t => t.Description).HasMaxLength(500);
        builder.HasIndex(t => new { t.UserId, t.Date });
    }
}
