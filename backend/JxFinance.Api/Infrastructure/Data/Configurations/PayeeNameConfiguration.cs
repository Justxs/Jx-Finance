using JxFinance.Common.Subscriptions;
using JxFinance.Domain.Payees;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class PayeeNameConfiguration : IEntityTypeConfiguration<PayeeName>
{
    public void Configure(EntityTypeBuilder<PayeeName> builder)
    {
        builder.Property(p => p.PayeeKey).HasMaxLength(SubscriptionDescription.MaxLength);
        builder.Property(p => p.Name).HasMaxLength(PayeeName.NameMaxLength);
        builder.HasIndex(p => new { p.UserId, p.PayeeKey })
            .IsUnique()
            .HasFilter(DbSchema.NotDeletedFilter);
    }
}
