using JxFinance.Domain.Audit;
using JxFinance.Domain.Households;
using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    public void Configure(EntityTypeBuilder<AuditEvent> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Action).HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.EntityKind).HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.Description).HasMaxLength(AuditEvent.DescriptionMaxLength);
        builder.ComplexCollection(e => e.Changes, changes =>
        {
            changes.ToJson();
            changes.Property(c => c.Field).HasJsonPropertyName("field");
            changes.Property(c => c.From).HasJsonPropertyName("from");
            changes.Property(c => c.To).HasJsonPropertyName("to");
        });
        builder.HasIndex(e => new { e.HouseholdId, e.OccurredAt });
        builder.HasIndex(e => e.OccurredAt);
        builder.HasOne<Household>().WithMany().HasForeignKey(e => e.HouseholdId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<AppUser>().WithMany().HasForeignKey(e => e.ActorUserId).OnDelete(DeleteBehavior.Restrict);
    }
}
