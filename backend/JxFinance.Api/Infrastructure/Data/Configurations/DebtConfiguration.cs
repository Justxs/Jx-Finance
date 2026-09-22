using JxFinance.Domain.NetWorth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class DebtConfiguration : IEntityTypeConfiguration<Debt>
{
    public void Configure(EntityTypeBuilder<Debt> builder)
    {
        builder.Property(d => d.Name).HasMaxLength(100);
        builder.ComplexProperty(d => d.OutstandingAmount, money => money.HasColumns("OutstandingAmount", DbSchema.CurrencyColumn));
        builder.Ignore(d => d.Currency);
        builder.Property(d => d.InterestRate).HasPrecision(5, 2);
        builder.HasIndex(d => d.UserId);
    }
}
