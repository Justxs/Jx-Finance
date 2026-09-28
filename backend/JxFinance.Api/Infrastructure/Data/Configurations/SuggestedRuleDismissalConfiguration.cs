using JxFinance.Common.Subscriptions;
using JxFinance.Domain.CategorizationRules;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class SuggestedRuleDismissalConfiguration : IEntityTypeConfiguration<SuggestedRuleDismissal>
{
    public void Configure(EntityTypeBuilder<SuggestedRuleDismissal> builder)
    {
        builder.Property(d => d.Key).HasMaxLength(SubscriptionDescription.MaxLength);
        builder.HasIndex(d => new { d.UserId, d.Key, d.CategoryId })
            .IsUnique()
            .HasFilter(DbSchema.NotDeletedFilter);
    }
}
