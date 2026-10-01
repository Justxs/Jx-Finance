using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class TransactionGroupConfiguration : IEntityTypeConfiguration<TransactionGroup>
{
    public void Configure(EntityTypeBuilder<TransactionGroup> builder)
    {
        builder.Property(g => g.Name).HasMaxLength(TransactionGroup.NameMaxLength);
        builder.HasIndex(g => g.UserId);
    }
}
