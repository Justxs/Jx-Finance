using JxFinance.Domain.Households;
using JxFinance.Domain.Tags;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.Property(t => t.Name).HasMaxLength(50);
        builder.HasIndex(t => t.UserId);
        builder.HasIndex(t => t.HouseholdId);
        builder.HasIndex(t => new { t.UserId, t.Name })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");
        builder.HasOne<Household>().WithMany().HasForeignKey(t => t.HouseholdId).OnDelete(DeleteBehavior.Restrict);
    }
}
