using System.Text.Json;
using System.Text.Json.Serialization;
using JxFinance.Domain.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

internal static class NotificationTypeConfigurationExtensions
{
    private static readonly JsonSerializerOptions TypesJson = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private static readonly ValueComparer<List<NotificationType>> TypesComparer = new(
        (left, right) => left!.SequenceEqual(right!),
        types => types.Aggregate(0, (hash, type) => HashCode.Combine(hash, type)),
        types => types.ToList());

    public static PropertyBuilder<List<NotificationType>> StoredAsJson(this PropertyBuilder<List<NotificationType>> types) =>
        types
            .HasColumnType(DbSchema.Json)
            .HasConversion(
                list => JsonSerializer.Serialize(list, TypesJson),
                text => JsonSerializer.Deserialize<List<NotificationType>>(text, TypesJson) ?? new List<NotificationType>(),
                TypesComparer);
}
