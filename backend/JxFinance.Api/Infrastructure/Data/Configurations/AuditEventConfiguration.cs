using System.Text.Json;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Households;
using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public void Configure(EntityTypeBuilder<AuditEvent> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Action).HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.EntityKind).HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.Description).HasMaxLength(AuditEvent.DescriptionMaxLength);
        builder.Property(e => e.Changes)
            .HasColumnType("jsonb")
            .HasConversion(
                changes => JsonSerializer.Serialize(changes, Json),
                json => JsonSerializer.Deserialize<List<AuditChange>>(json, Json) ?? new List<AuditChange>(),
                new ValueComparer<List<AuditChange>>(
                    (left, right) => left!.SequenceEqual(right!),
                    changes => changes.Aggregate(0, (hash, change) => HashCode.Combine(hash, change.GetHashCode())),
                    changes => changes.ToList()));
        builder.HasIndex(e => new { e.HouseholdId, e.OccurredAt });
        builder.HasIndex(e => e.OccurredAt);
        builder.HasOne<Household>().WithMany().HasForeignKey(e => e.HouseholdId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<AppUser>().WithMany().HasForeignKey(e => e.ActorUserId).OnDelete(DeleteBehavior.Restrict);
    }
}
