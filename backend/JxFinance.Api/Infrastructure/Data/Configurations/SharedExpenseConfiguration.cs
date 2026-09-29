using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class SharedExpenseConfiguration : IEntityTypeConfiguration<SharedExpense>
{
    public void Configure(EntityTypeBuilder<SharedExpense> builder)
    {
        builder.ComplexProperty(e => e.Amount, money => money.HasColumns("Amount", DbSchema.CurrencyColumn));
        builder.Property(e => e.Description).HasMaxLength(SharedExpense.DescriptionMaxLength);
        builder.HasOne<Transaction>().WithMany().HasForeignKey(e => e.TransactionId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(e => e.TransactionId).IsUnique().HasFilter(DbSchema.NotDeletedFilter);
        builder.HasIndex(e => new { e.HouseholdId, e.Date });
    }
}
