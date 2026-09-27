using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class DebtPaymentConfiguration : IEntityTypeConfiguration<DebtPayment>
{
    public void Configure(EntityTypeBuilder<DebtPayment> builder)
    {
        builder.HasIndex(p => p.TransactionId).IsUnique().HasFilter(DbSchema.NotDeletedFilter);
        builder.HasOne<Debt>().WithMany().HasForeignKey(p => p.DebtId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Transaction>().WithMany().HasForeignKey(p => p.TransactionId).OnDelete(DeleteBehavior.Cascade);
    }
}
