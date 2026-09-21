using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class CategorizationRuleConfiguration : IEntityTypeConfiguration<CategorizationRule>
{
    public void Configure(EntityTypeBuilder<CategorizationRule> builder)
    {
        builder.Property(r => r.Name).HasMaxLength(50);
        builder.Property(r => r.Pattern).HasMaxLength(200);
        builder.Property(r => r.Match).HasConversion<string>().HasMaxLength(20);
        builder.Property(r => r.MinAmount).HasPrecision(18, 2);
        builder.Property(r => r.MaxAmount).HasPrecision(18, 2);
        builder.HasIndex(r => new { r.UserId, r.Position });
        builder.HasOne<Account>().WithMany().HasForeignKey(r => r.AccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Category>().WithMany().HasForeignKey(r => r.CategoryId).OnDelete(DeleteBehavior.Restrict);
    }
}
