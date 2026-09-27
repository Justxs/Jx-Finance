using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ComplexProperty(t => t.Amount, money => money.HasColumns("Amount", DbSchema.CurrencyColumn));
        builder.Property(t => t.Description).HasMaxLength(500);
        builder.Property(t => t.ImportRef).HasMaxLength(64);
        builder.Property(t => t.UnusualBasis).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.UnusualFactor).HasPrecision(9, 2);
        builder.HasIndex(t => new { t.AccountId, t.Date }, "IX_Transactions_Unusual")
            .HasFilter("\"UnusualBasis\" IS NOT NULL AND \"UnusualDismissedAt\" IS NULL");
        builder.HasIndex(t => t.UnusualCheckedAt)
            .HasFilter("\"UnusualCheckedAt\" IS NULL");
        builder.HasIndex(t => new { t.UserId, t.Date });
        builder.HasIndex(t => new { t.AccountId, t.Date });
        builder.HasIndex(t => new { t.AccountId, t.ImportRef })
            .IsUnique()
            .HasFilter("\"ImportRef\" IS NOT NULL");
    }
}
