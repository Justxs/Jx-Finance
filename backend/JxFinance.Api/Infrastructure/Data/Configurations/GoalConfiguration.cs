using JxFinance.Domain.Accounts;
using JxFinance.Domain.Goals;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class GoalConfiguration : IEntityTypeConfiguration<Goal>
{
    public void Configure(EntityTypeBuilder<Goal> builder)
    {
        builder.Property(g => g.Name).HasMaxLength(100);
        builder.Property(g => g.FundingSharePercent).HasDefaultValue(100);
        builder.HasIndex(g => g.UserId);
        builder.HasOne<Account>().WithMany().HasForeignKey(g => g.FundingAccountId).OnDelete(DeleteBehavior.Restrict);
    }
}
