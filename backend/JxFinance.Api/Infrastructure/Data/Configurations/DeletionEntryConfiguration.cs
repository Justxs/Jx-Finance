using JxFinance.Domain.Trash;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class DeletionEntryConfiguration : IEntityTypeConfiguration<DeletionEntry>
{
    public void Configure(EntityTypeBuilder<DeletionEntry> builder)
    {
        builder.Property(e => e.Kind).HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.Description).HasMaxLength(DeletionEntry.DescriptionMaxLength);
        builder.HasIndex(e => new { e.UserId, e.DeletedAt });
        builder.HasIndex(e => new { e.Kind, e.EntityId });
    }
}
