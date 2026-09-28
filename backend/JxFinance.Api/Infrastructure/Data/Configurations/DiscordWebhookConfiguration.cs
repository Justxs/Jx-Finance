using JxFinance.Domain.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class DiscordWebhookConfiguration : IEntityTypeConfiguration<DiscordWebhook>
{
    public void Configure(EntityTypeBuilder<DiscordWebhook> builder)
    {
        builder.Property(w => w.ProtectedUrl).HasMaxLength(DiscordWebhook.ProtectedUrlMaxLength).IsConcurrencyToken();
        builder.Property(w => w.LastError).HasMaxLength(DiscordWebhook.ErrorMaxLength);
        builder.Property(w => w.Types).StoredAsJson();
        builder.HasIndex(w => w.UserId).IsUnique().HasFilter(DbSchema.NotDeletedFilter);
    }
}
