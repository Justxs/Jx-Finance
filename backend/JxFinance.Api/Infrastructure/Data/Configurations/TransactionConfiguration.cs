using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ComplexProperty(t => t.Amount, money => money.HasColumns("Amount", DbSchema.CurrencyColumn));
        builder.Property(t => t.ReportingAmount).HasPrecision(18, 2);
        builder.Property(t => t.Description).HasMaxLength(500);
        builder.Property(t => t.ImportRef).HasMaxLength(64);
        builder.HasIndex(t => new { t.UserId, t.Date });
        builder.HasIndex(t => new { t.AccountId, t.Date });
        builder.HasIndex(t => t.CategoryId);
        builder.HasIndex(t => new { t.AccountId, t.ImportRef })
            .IsUnique()
            .HasFilter("\"ImportRef\" IS NOT NULL");
        builder.HasOne<Account>().WithMany().HasForeignKey(t => t.AccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Category>().WithMany().HasForeignKey(t => t.CategoryId).OnDelete(DeleteBehavior.Restrict);
    }
}
