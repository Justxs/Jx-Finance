using JxFinance.Domain.Trash;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class DeletionChangeConfiguration : IEntityTypeConfiguration<DeletionChange>
{
    public void Configure(EntityTypeBuilder<DeletionChange> builder)
    {
        builder.HasKey(c => new { c.DeletionEntryId, c.Kind, c.RowId });
        builder.Property(c => c.Kind).HasConversion<string>().HasMaxLength(30);
        builder.HasOne<DeletionEntry>()
            .WithMany(e => e.Changes)
            .HasForeignKey(c => c.DeletionEntryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
