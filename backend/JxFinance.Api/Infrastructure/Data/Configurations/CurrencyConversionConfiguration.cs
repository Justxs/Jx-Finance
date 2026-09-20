using JxFinance.Domain.Accounts;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class CurrencyConversionConfiguration : IEntityTypeConfiguration<CurrencyConversion>
{
    public void Configure(EntityTypeBuilder<CurrencyConversion> builder)
    {
        builder.ComplexProperty(c => c.FromAmount, money => money.HasColumns("FromAmount", "FromCurrency"));
        builder.ComplexProperty(c => c.ToAmount, money => money.HasColumns("ToAmount", "ToCurrency"));
        builder.Property(c => c.Description).HasMaxLength(500);
        builder.Property(c => c.ImportRef).HasMaxLength(64);
        builder.HasIndex(c => new { c.AccountId, c.Date });
        builder.HasIndex(c => new { c.AccountId, c.ImportRef }).IsUnique();
        builder.HasOne<Account>().WithMany().HasForeignKey(c => c.AccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Transaction>().WithMany().HasForeignKey(c => c.FeeTransactionId).OnDelete(DeleteBehavior.Restrict);
    }
}
