using JxFinance.Common.Subscriptions;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.RecurringBills;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class RecurringBillConfiguration : IEntityTypeConfiguration<RecurringBill>
{
    public void Configure(EntityTypeBuilder<RecurringBill> builder)
    {
        builder.Property(b => b.Name).HasMaxLength(100);
        builder.Property(b => b.MatchKey).HasMaxLength(SubscriptionDescription.MaxLength);
        builder.Property(b => b.NextDueDate).IsConcurrencyToken();
        builder.HasOne<Debt>().WithMany().HasForeignKey(b => b.DebtId).OnDelete(DeleteBehavior.SetNull);
    }
}
