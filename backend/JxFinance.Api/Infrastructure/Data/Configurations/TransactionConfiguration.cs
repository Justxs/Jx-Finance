using JxFinance.Common.Subscriptions;
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
        builder.Property(t => t.Note).HasMaxLength(TransactionNote.MaxLength);
        builder.Property(t => t.ImportRef).HasMaxLength(64);
        builder.Property(t => t.PayeeKey).HasMaxLength(SubscriptionDescription.MaxLength);
        builder.Property(t => t.Place).HasMaxLength(TransactionPlace.MaxLength);
        builder.Property(t => t.Latitude).HasPrecision(7, TransactionPlace.CoordinateDecimals);
        builder.Property(t => t.Longitude).HasPrecision(8, TransactionPlace.CoordinateDecimals);
        builder.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_Transactions_Coordinates",
                """("Latitude" IS NULL) = ("Longitude" IS NULL)""");
            table.HasCheckConstraint(
                "CK_Transactions_SpreadMonths",
                $"""
                "SpreadMonths" IS NULL OR "SpreadMonths" BETWEEN {TransactionSpread.MinMonths} AND {TransactionSpread.MaxMonths}
                """);
            table.HasCheckConstraint(
                "CK_Transactions_SpreadUntil",
                """("SpreadMonths" IS NULL) = ("SpreadUntil" IS NULL)""");
        });
        builder.HasIndex(t => new { t.AccountId, t.SpreadUntil }, "IX_Transactions_Spread")
            .HasFilter("\"SpreadMonths\" IS NOT NULL");
        builder.HasIndex(t => new { t.AccountId, t.Place }, "IX_Transactions_Place")
            .HasFilter("\"Place\" IS NOT NULL");
        builder.ComplexProperty(t => t.Unusual, unusual =>
        {
            unusual.Property(u => u.Basis).HasColumnName("UnusualBasis").HasConversion<string>().HasMaxLength(20);
            unusual.Property(u => u.TypicalAmount).HasColumnName("UnusualTypicalAmount");
            unusual.Property(u => u.Factor).HasColumnName("UnusualFactor").HasPrecision(9, 2);
            unusual.Property(u => u.SampleSize).HasColumnName("UnusualSampleSize");
        });
        builder.HasIndex(t => new { t.AccountId, t.Date }, "IX_Transactions_Unusual")
            .HasFilter("\"UnusualBasis\" IS NOT NULL AND \"UnusualDismissedAt\" IS NULL");
        builder.HasIndex(t => t.UnusualCheckedAt)
            .HasFilter("\"UnusualCheckedAt\" IS NULL");
        builder.HasIndex(t => t.Id, "IX_Transactions_PayeeKeyPending")
            .HasFilter("\"PayeeKey\" IS NULL");
        builder.HasOne<Transaction>().WithMany().HasForeignKey(t => t.RefundOfTransactionId).OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(t => t.RefundOfTransactionId).HasFilter("\"RefundOfTransactionId\" IS NOT NULL");
        builder.HasIndex(t => new { t.UserId, t.Date });
        builder.HasIndex(t => new { t.AccountId, t.Date });
        builder.HasIndex(t => new { t.AccountId, t.ImportRef })
            .IsUnique()
            .HasFilter("\"ImportRef\" IS NOT NULL");
    }
}
