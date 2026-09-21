using System.Text.Json;
using System.Text.Json.Serialization;
using JxFinance.Domain.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    private static readonly JsonSerializerOptions PayloadJson = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private static readonly ValueComparer<NotificationPayload?> PayloadComparer = new(
        (left, right) => left == null ? right == null : left.Equals(right),
        payload => payload == null ? 0 : payload.GetHashCode(),
        payload => payload);

    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.Property(n => n.Title).HasMaxLength(200);
        builder.Property(n => n.Message).HasMaxLength(1000);
        builder.Property(n => n.RelatedType).HasMaxLength(50);
        builder.Property(n => n.Payload)
            .HasColumnType("jsonb")
            .HasConversion(
                payload => JsonSerializer.Serialize(payload, PayloadJson),
                text => JsonSerializer.Deserialize<NotificationPayload>(text, PayloadJson),
                PayloadComparer);
        builder.HasIndex(n => new { n.UserId, n.IsRead });
    }
}
