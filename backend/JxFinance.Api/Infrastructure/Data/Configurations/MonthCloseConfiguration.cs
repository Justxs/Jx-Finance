using System.Text.Json;
using System.Text.Json.Serialization;
using JxFinance.Domain.MonthCloses;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class MonthCloseConfiguration : IEntityTypeConfiguration<MonthClose>
{
    private static readonly JsonSerializerOptions SnapshotJson = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private static readonly ValueComparer<MonthCloseSnapshot> SnapshotComparer = new(
        (left, right) => ReferenceEquals(left, right) || Serialize(left!) == Serialize(right!),
        snapshot => Serialize(snapshot).GetHashCode(StringComparison.Ordinal),
        snapshot => snapshot);

    public void Configure(EntityTypeBuilder<MonthClose> builder)
    {
        builder.Property(c => c.Note).HasMaxLength(MonthClose.NoteMaxLength);
        builder.Property(c => c.Snapshot)
            .HasColumnType(DbSchema.Json)
            .HasConversion(
                snapshot => Serialize(snapshot),
                text => JsonSerializer.Deserialize<MonthCloseSnapshot>(text, SnapshotJson)!,
                SnapshotComparer);
        builder.HasIndex(c => new { c.UserId, c.Month, c.HouseholdId })
            .IsUnique()
            .AreNullsDistinct(false);
    }

    private static string Serialize(MonthCloseSnapshot snapshot) => JsonSerializer.Serialize(snapshot, SnapshotJson);
}
