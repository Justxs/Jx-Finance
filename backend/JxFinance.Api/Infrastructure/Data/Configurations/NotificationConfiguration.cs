using JxFinance.Domain.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.Property(n => n.Title).HasMaxLength(200);
        builder.Property(n => n.Message).HasMaxLength(1000);
        builder.Property(n => n.RelatedType).HasMaxLength(50);
        builder.HasIndex(n => new { n.UserId, n.IsRead });
    }
}
