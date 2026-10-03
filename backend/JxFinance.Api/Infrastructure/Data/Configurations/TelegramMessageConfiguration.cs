using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class TelegramMessageConfiguration : IEntityTypeConfiguration<TelegramMessage>
{
    public void Configure(EntityTypeBuilder<TelegramMessage> builder)
    {
        builder.Property(m => m.NotificationType).HasConversion<string>().HasMaxLength(40);
        builder.Property(m => m.Content).HasMaxLength(TelegramMessage.ContentMaxLength);
        builder.Property(m => m.DedupeKey).HasMaxLength(OutboxMessage.DedupeKeyMaxLength);
        builder.Property(m => m.LastError).HasMaxLength(OutboxMessage.ErrorMaxLength);
        builder.HasIndex(m => m.DedupeKey).IsUnique().HasFilter("\"DedupeKey\" IS NOT NULL");
        builder.HasIndex(m => new { m.SentAt, m.NextAttemptAt });
        builder.HasIndex(m => m.UserId);
    }
}
