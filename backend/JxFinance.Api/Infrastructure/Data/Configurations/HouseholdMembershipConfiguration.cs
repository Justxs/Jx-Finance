using JxFinance.Domain.Households;
using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class HouseholdMembershipConfiguration : IEntityTypeConfiguration<HouseholdMembership>
{
    public void Configure(EntityTypeBuilder<HouseholdMembership> builder)
    {
        builder.HasIndex(m => new { m.HouseholdId, m.UserId }).IsUnique();
        builder.HasOne<AppUser>().WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}
