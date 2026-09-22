using JxFinance.Common.Subscriptions;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.RecurringBills;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class SubscriptionDismissalConfiguration : IEntityTypeConfiguration<SubscriptionDismissal>
{
    public void Configure(EntityTypeBuilder<SubscriptionDismissal> builder)
    {
        builder.Property(d => d.Description).HasMaxLength(SubscriptionDescription.MaxLength);
        builder.HasIndex(d => new { d.UserId, d.AccountId, d.Description })
            .IsUnique()
            .HasFilter(DbSchema.NotDeletedFilter);
        builder.HasOne<Account>().WithMany().HasForeignKey(d => d.AccountId).OnDelete(DeleteBehavior.Restrict);
    }
}
