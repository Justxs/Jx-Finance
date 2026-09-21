using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class TransactionTagConfiguration : IEntityTypeConfiguration<TransactionTag>
{
    public void Configure(EntityTypeBuilder<TransactionTag> builder)
    {
        builder.HasKey(t => new { t.TransactionId, t.TagId });
        builder.HasIndex(t => new { t.TagId, t.TransactionId });
        builder.HasOne<Transaction>().WithMany().HasForeignKey(t => t.TransactionId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Tag>().WithMany().HasForeignKey(t => t.TagId).OnDelete(DeleteBehavior.Restrict);
    }
}
