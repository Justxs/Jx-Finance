using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Tags;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class CategorizationRuleTagConfiguration : IEntityTypeConfiguration<CategorizationRuleTag>
{
    public void Configure(EntityTypeBuilder<CategorizationRuleTag> builder)
    {
        builder.HasKey(t => new { t.RuleId, t.TagId });
        builder.HasOne<CategorizationRule>().WithMany().HasForeignKey(t => t.RuleId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Tag>().WithMany().HasForeignKey(t => t.TagId).OnDelete(DeleteBehavior.Restrict);
    }
}
