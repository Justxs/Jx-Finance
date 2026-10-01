using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class DuplicateDismissalConfiguration : IEntityTypeConfiguration<DuplicateDismissal>
{
    public void Configure(EntityTypeBuilder<DuplicateDismissal> builder)
    {
        builder.HasKey(d => new { d.TransactionId, d.OtherTransactionId });
        builder.HasIndex(d => d.OtherTransactionId);
        builder.HasOne<Transaction>().WithMany().HasForeignKey(d => d.TransactionId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Transaction>().WithMany().HasForeignKey(d => d.OtherTransactionId).OnDelete(DeleteBehavior.Cascade);
    }
}
