using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class TransactionLineConfiguration : IEntityTypeConfiguration<TransactionLine>
{
    public void Configure(EntityTypeBuilder<TransactionLine> builder)
    {
        builder.Property(l => l.Description).HasMaxLength(500);
        builder.HasOne<Transaction>().WithMany().HasForeignKey(l => l.TransactionId).OnDelete(DeleteBehavior.Cascade);
    }
}
