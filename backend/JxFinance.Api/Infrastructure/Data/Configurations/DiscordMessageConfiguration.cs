using JxFinance.Domain.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class DiscordMessageConfiguration : IEntityTypeConfiguration<DiscordMessage>
{
    public void Configure(EntityTypeBuilder<DiscordMessage> builder)
    {
        builder.Property(m => m.NotificationType).HasConversion<string>().HasMaxLength(40);
        builder.Property(m => m.Content).HasMaxLength(DiscordMessage.ContentMaxLength);
        builder.Property(m => m.DedupeKey).HasMaxLength(DiscordMessage.DedupeKeyMaxLength);
        builder.Property(m => m.LastError).HasMaxLength(DiscordMessage.ErrorMaxLength);
        builder.HasIndex(m => m.DedupeKey).IsUnique().HasFilter("\"DedupeKey\" IS NOT NULL");
        builder.HasIndex(m => new { m.SentAt, m.NextAttemptAt });
        builder.HasIndex(m => m.UserId);
    }
}
