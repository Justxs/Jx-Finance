using System.Text.Json;
using System.Text.Json.Serialization;
using JxFinance.Domain.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class DiscordWebhookConfiguration : IEntityTypeConfiguration<DiscordWebhook>
{
    private static readonly JsonSerializerOptions TypesJson = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private static readonly ValueComparer<List<NotificationType>> TypesComparer = new(
        (left, right) => left!.SequenceEqual(right!),
        types => types.Aggregate(0, (hash, type) => HashCode.Combine(hash, type)),
        types => types.ToList());

    public void Configure(EntityTypeBuilder<DiscordWebhook> builder)
    {
        builder.Property(w => w.ProtectedUrl).HasMaxLength(DiscordWebhook.ProtectedUrlMaxLength).IsConcurrencyToken();
        builder.Property(w => w.LastError).HasMaxLength(DiscordWebhook.ErrorMaxLength);
        builder.Property(w => w.Types)
            .HasColumnType(DbSchema.Json)
            .HasConversion(
                types => JsonSerializer.Serialize(types, TypesJson),
                text => JsonSerializer.Deserialize<List<NotificationType>>(text, TypesJson) ?? new List<NotificationType>(),
                TypesComparer);
        builder.HasIndex(w => w.UserId).IsUnique().HasFilter(DbSchema.NotDeletedFilter);
    }
}
